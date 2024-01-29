# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


from playwright.sync_api import Page, expect

from e2e_playwright.conftest import wait_for_app_run


def test_runs_cached_function_with_new_widget_values(app: Page):
    expect(app.get_by_test_id("stRadio")).to_have_count(1)
    expect(app.get_by_test_id("stText")).to_have_text("['function ran']")
    app.get_by_text("click to rerun").click()

    wait_for_app_run(app)
    expect(app.get_by_test_id("stRadio")).to_have_count(1)
    expect(app.get_by_test_id("stText")).to_have_text("[]")

    app.get_by_test_id("stRadio").nth(0).locator(
        'label[data-baseweb="radio"]'
    ).last.click()
    expect(app.get_by_test_id("stRadio")).to_have_count(1)
    expect(app.get_by_test_id("stText")).to_have_text("['function ran']")
    app.get_by_text("click to rerun").click()

    wait_for_app_run(app)
    expect(app.get_by_test_id("stRadio")).to_have_count(1)
    expect(app.get_by_test_id("stText")).to_have_text("[]")
