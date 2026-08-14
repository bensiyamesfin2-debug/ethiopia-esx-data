# Ethiopia ESX Data

A deliberately small dashboard for ESX-listed companies and five sourced Ethiopian economic indicators.

## Run

Requires Node.js 22.5 or newer.

```bash
npm start
```

Open `http://localhost:3000`. Run checks with `npm test`.

The SQLite database is created automatically as `data.db`. Current values include their period and source URL. The World Bank button imports historical GDP, inflation and reserve observations from its public API.

## Excel import

Create an `.xlsx` file with a sheet named `Indicators`. Its headings are `name`, `period`, `value`, `source`, and `source_url`. The name must match one of the five indicator names. For a deployed site, set `IMPORT_KEY` and enter that key when importing.

## Data model

- `companies`: ESX issuer directory
- `indicators`: the five approved economic indicators
- `indicator_values`: dated, historical indicator observations

Company listing information should be verified against [ESX](https://esx.et/equity-market/listed-companies/). Economic values should come from the named official sources.
