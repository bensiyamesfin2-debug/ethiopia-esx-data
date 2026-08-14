# Ethiopia ESX Data

A deliberately small, dependency-free dashboard for ESX-listed companies and five Ethiopian economic indicators.

## Run

Requires Node.js 22.5 or newer.

```bash
npm start
```

Open `http://localhost:3000`. Run checks with `npm test`.

The SQLite database is created automatically as `data.db`. Indicator cards stay blank until a verified value is stored, so the interface never presents invented figures.

## Data model

- `companies`: ESX issuer directory
- `indicators`: the five approved economic indicators
- `indicator_values`: dated, historical indicator observations

Company listing information should be verified against [ESX](https://esx.et/equity-market/listed-companies/). Economic values should come from the named official sources.
