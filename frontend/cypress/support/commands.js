/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import path from "path"
import * as _ from "lodash"

// https://github.com/palmerhq/cypress-image-snapshot#installation
import { addMatchImageSnapshotCommand } from "cypress-image-snapshot/command"
import "cypress-file-upload"

/**
 * Returns an OS and device-pixel-ratio specific snapshot folder, e.g. <rootDir>/cypress/snapshots/darwin/2x
 * We use per-OS snapshots to account for rendering differences in fonts and UI widgets.
 * We use per-DPR snapshots to account for rendering differences in image dimensions.
 */
function getSnapshotFolder() {
  const devicePixelRatio = Cypress.env("devicePixelRatio") || 2
  return path.join(
    "cypress",
    "snapshots",
    Cypress.platform,
    devicePixelRatio + "x"
  )
}

addMatchImageSnapshotCommand({
  customSnapshotsDir: getSnapshotFolder(),
  failureThreshold: 0.01, // Threshold for entire image
  failureThresholdType: "percent", // Percent of image or number of pixels
})

Cypress.Commands.add("openSettings", () => {
  cy.get("#MainMenu > button").click()
  cy.get('[data-testid="main-menu-list"]').should("contain.text", "Settings")
  cy.get('[data-testid="main-menu-list"]')
    .contains("Settings")
    .click({ force: true })
})

Cypress.Commands.add("changeTheme", theme => {
  cy.openSettings()
  cy.get('[data-baseweb="modal"] .stSelectbox').then(el => {
    cy.wrap(el).find("input").click()
    cy.get("li").contains(theme).click()
  })
  cy.get('[data-baseweb="modal"] [aria-label="Close"]').click()
})

/**
 * Normal usage:
 *
 *   cy.get("my selector").first().matchImageSnapshot("my filename")
 *
 * This means the "subject" in the matchThemedSnapshots function will be the
 * result of cy.get("my selector").first(). However, in some cases the subject
 * detaches from the DOM when we change themes (this seems to happen with the
 * image in the staticfiles_app test, for example), causing Cypress to fail.
 * When that happens, you can fix the issue by passing a getSubject function
 * to this command to get the subject from the DOM again, like this:
 *
 *   cy.get("body").matchImageSnapshot(
 *     "my filename", {},
 *     () => cy.get("my selector").first()
 *   )
 *
 * Note that the example above uses cy.get("body") because that part of the
 * incantation doesn't actually matter. It just needs to exist.
 */
Cypress.Commands.add(
  "matchThemedSnapshots",
  { prevSubject: true },
  (subject, name, options, getSubject) => {
    const testName = name || Cypress.mocha.getRunner().suite.ctx.test.title
    const setStates = () => {
      const { focus } = _.pick(options, ["focus"])
      if (focus) {
        cy.get(subject).within(() => {
          cy.get(focus).focus()
        })
      }
    }

    if (!getSubject) {
      getSubject = () => cy.wrap(subject)
    }

    // Get dark mode snapshot first. Taking light mode snapshot first
    // for some reason ends up comparing dark with light
    cy.changeTheme("Dark")
    setStates()
    getSubject().matchImageSnapshot(`${testName}-dark`, {
      ...options,
      force: false,
    })

    // Revert back to light mode
    cy.changeTheme("Light")
    setStates()
    getSubject().matchImageSnapshot(testName, { ...options, force: false })
    cy.screenshot()
  }
)

// Calling trigger before capturing the snapshot forces Cypress to very Actionability.
// https://docs.cypress.io/guides/core-concepts/interacting-with-elements.html#Actionability
// This fixes the issue where snapshots are cutoff or the wrong element is captured.
Cypress.Commands.overwrite(
  "matchImageSnapshot",
  (originalFn, subject, name, options) => {
    cy.wrap(subject).trigger("blur", _.pick(options, ["force"]))

    const headerHeight = 2.875 // In rem
    const fontSizeMedium = 16 // In px
    cy.get(subject).scrollIntoView({
      offset: {
        top: -1 * headerHeight * fontSizeMedium,
      },
    })

    return originalFn(subject, name, options)
  }
)

Cypress.Commands.add("loadApp", (appUrl, timeout) => {
  cy.visit(appUrl)

  cy.waitForScriptFinish(timeout)
})

Cypress.Commands.add("waitForScriptFinish", (timeout = 20000) => {
  // Wait until we know the script has started. We determine this by checking
  // whether the app is in notRunning state. (The data-teststate attribute goes
  // through the sequence "initial" -> "running" -> "notRunning")
  cy.get("[data-testid='stApp'][data-teststate='notRunning']", {
    timeout,
  }).should("exist")
})

// Indexing into a list of elements produced by `cy.get()` may fail if not enough
// elements are rendered, but this does not prompt cypress to retry the `get` call,
// so the list will never update. This is a major cause of flakiness in tests.
// The solution is to use `should` to wait for enough elements to be available first.
// This is a convenience function for doing this automatically.
Cypress.Commands.add("getIndexed", (selector, index) =>
  cy
    .get(selector)
    .should("have.length.at.least", index + 1)
    .eq(index)
)

// The header at the top of the page can sometimes interfere when we are
// attempting to take snapshots. This command removes the problematic parts to
// avoid this issue.
Cypress.Commands.add("prepForElementSnapshots", () => {
  // Look for the ribbon and if its found,
  // make the ribbon decoration line disappear as it can occasionally get
  // caught when a snapshot is taken.
  cy.get(".stApp").then($body => {
    if ($body.find("[data-testid='stDecoration']").length > 0) {
      cy.get("[data-testid='stDecoration']").invoke("css", "display", "none")
    }
  })

  // Similarly, the header styling can sometimes interfere with the snapshot
  // for elements near the top of the page.
  cy.get(".stApp > header").invoke("css", "background", "none")
  cy.get(".stApp > header").invoke("css", "backdropFilter", "none")
})

// Allows the user to execute code within the iframe itself
// This is useful for testing/changing examples of Streamlit embeddings
Cypress.Commands.add(
  "iframe",
  { prevSubject: "element" },
  ($iframe, callback = () => {}) => {
    // For more info on targeting inside iframes refer to this GitHub issue:
    // https://github.com/cypress-io/cypress/issues/136
    cy.log("Getting iframe body")

    return cy
      .wrap($iframe)
      .should(iframe => expect(iframe.contents().find("body")).to.exist)
      .then(iframe => cy.wrap(iframe.contents().find("body")))
      .within({}, callback)
  }
)

// Rerun the script by simulating the user pressing the 'r' key.
Cypress.Commands.add("rerunScript", () => {
  cy.get(".stApp [data-testid='stHeader']").trigger("keypress", {
    keyCode: 82, // "r"
    which: 82, // "r"
    force: true,
  })
})

Cypress.Commands.add("waitForRerun", () => {
  cy.get("[data-testid='stStatusWidget']", { timeout: 10000 }).should("exist")
  cy.get("[data-testid='stStatusWidget']", { timeout: 10000 }).should(
    "not.exist"
  )
})

// https://github.com/quasarframework/quasar/issues/2233
// This error means that ResizeObserver was not able to deliver all observations within a single animation frame
// It is benign (your site will not break).
const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/
Cypress.on("uncaught:exception", err => {
  /* returning false here prevents Cypress from failing the test */
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false
  }
})
