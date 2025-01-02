# Contributing

## Table of Contents
- [Contributing](#contributing)
  - [Table of Contents](#table-of-contents)
  - [Development](#development)
    - [Requirements](#requirements)
    - [Terminal Commands](#terminal-commands)
    - [Testing the Project](#testing-the-project)
    - [Translations](#translations)
  - [Translating](#translating)

## Development

### Requirements
- [Node.js (LTS)](https://nodejs.org/en)
- [Visual Studio Code](https://code.visualstudio.com/)

### Terminal Commands
1. **Install dependencies:**
    ```bash
    npm install
    ```
2. **Run Tailwind CSS:**
    ```bash
    npm run tailwindcss
    ```
3. **Open a new VS Code terminal for testing.**

### Testing the Project
You can test the project using:
```bash
npm start
```
Alternatively, build the project with:
```bash
npm run build
```
After building, install the installer located in the `dist` folder.

### Translations
The project supports multiple languages. If you make changes, follow these steps:

- **HTML Translations:**
  - Use the `data-lang` attribute to add a translation key in HTML.
  - **Example:**
    ```html
    <button data-lang="control_obs_btn">Control OBS</button>
    ```

- **JavaScript Translations:**
  - In `main.js`, use `i18next.t('')`.
    - **Example:**
      ```javascript
      const example = i18next.t('update_dialog_button_later');
      ```
  - In isolated js files use `window.i18n.t('')`.

- **Update Source Translations:**
  After modifying translations, run the following script to update the source translations:
    ```bash
    npm run updateTranslations
    ```

---

## Translating

The translation process is completely managed via the [Crowdin Platform](https://crowdin.com/project/shared-obs-control).
