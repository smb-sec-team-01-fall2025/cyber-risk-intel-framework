# User Guide: Asset Management

This guide provides instructions for managing assets through the API, including creating, viewing, updating, deleting, and importing assets in bulk.

## API Endpoint Base

All asset-related API endpoints are available under `/api/assets`.

## Authentication

_(Note: Authentication is not yet implemented in the current MVP.)_

## Managing Single Assets

You can use `curl` or any API client to interact with the asset endpoints.

### 1. Create a New Asset

To create a new asset, you send a `POST` request with the asset's details in the JSON body.

**Endpoint:** `POST /api/assets`

**Example Request:**

```bash
curl -X 'POST' \
  'http://localhost:5173/api/assets' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Primary Web Server",
    "type": "HW",
    "ip": "192.168.1.100",
    "hostname": "web01.int.acme.org",
    "owner": "IT Department",
    "business_unit": "Corporate",
    "criticality": 5,
    "data_sensitivity": "HIGH"
  }'
```

**Successful Response (201 Created):**

The API will return the full asset object, including its newly assigned `id`.

### 2. Read All Assets

To get a list of all assets, send a `GET` request.

**Endpoint:** `GET /api/assets`

**Example Request:**

```bash
curl -X 'GET' 'http://localhost:5173/api/assets' -H 'accept: application/json'
```

### 3. Read a Single Asset

To view the details of a specific asset, use a `GET` request with the asset's `id`.

**Endpoint:** `GET /api/assets/{asset_id}`

**Example Request (for asset with ID 1):**

```bash
curl -X 'GET' 'http://localhost:5173/api/assets/1' -H 'accept: application/json'
```

### 4. Update an Asset

To update an asset, send a `PUT` request with the fields you want to change.

**Endpoint:** `PUT /api/assets/{asset_id}`

**Example Request (updating the owner of asset 1):**

```bash
curl -X 'PUT' \
  'http://localhost:5173/api/assets/1' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "owner": "DevOps Team"
  }'
```

### 5. Delete an Asset

To delete an asset, use a `DELETE` request with the asset's `id`.

**Endpoint:** `DELETE /api/assets/{asset_id}`

**Example Request (deleting asset 1):**

```bash
curl -X 'DELETE' 'http://localhost:5173/api/assets/1' -H 'accept: application/json'
```

**Successful Response (200 OK):**

```json
{
  "ok": true
}
```

## Bulk Importing Assets

You can import multiple assets at once from a CSV file. You can do this via the UI on the Assets page or by using `curl`.

### CSV File Format

The CSV file must have a header row with the following columns: `name`, `type`, `ip`, `hostname`, `owner`, `business_unit`, `criticality`, `data_sensitivity`.

You can download a template file from the Assets page UI.

### API `curl` Command

To import via the command line, use a `POST` request to the `/api/assets/import` endpoint.

**Example Request:**

```bash
curl -X POST -F 'file=@data/samples/sample_assets.csv' http://localhost:5173/api/assets/import
```

**Dry Run Mode:**

To validate the file without saving any data, you can add the `dry_run=true` form field.

```bash
curl -X POST -F 'file=@data/samples/sample_assets.csv' -F 'dry_run=true' http://localhost:5173/api/assets/import
```

## Running the Identify Agent

After you have created or imported assets, you should run the Identify Agent. This agent performs two main functions:

1.  **Asset Enrichment (Placeholder)**: A placeholder step that simulates enriching asset data. In a real system, this would involve scanning and fingerprinting.
2.  **Intel Linking**: The agent scans for intelligence events in the database and links them to your assets based on matching IP addresses.

Running the agent is essential for keeping risk scores accurate, as they are calculated based on the number of linked intel events.

You can trigger the agent by sending a `POST` request to the `/api/identify/run` endpoint. This will start the process as a background task on the server.

**Example `curl` Command:**

```bash
curl -X POST 'http://localhost:5173/api/identify/run' -H 'accept: application/json'
```

**Successful Response (200 OK):**

```json
{
  "message": "Identify Agent scan started in the background."
}
```
