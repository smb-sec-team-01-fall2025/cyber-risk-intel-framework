# AI-Augmented Cyber Risk & Threat Intelligence Framework for SMBs

## Team Roster & Roles

- [@ben-blake](https://github.com/ben-blake) - ?
- [@tinana2k](https://github.com/tinana2k) - ?
- [@bhavani-adula](https://github.com/Bhavani-Adula) - ?
- [@geethspadamati](https://github.com/Geethspadamati) - ?
- [@mukunda5125](https://github.com/mukunda5125) - ?
- [@srujanareddykunta](https://github.com/srujanareddykunta-cell) - ?

## Quickstart

### Backend

```bash
# Navigate to backend directory
cd src/backend

# Install dependencies
pip install fastapi uvicorn

# Start the development server
uvicorn app:app --reload --port 8000
```

The backend API will be available at http://localhost:8000

### Frontend

```bash
# Navigate to frontend directory
cd src/frontend

# Install dependencies
npm install

# Start the development server
npm run dev --port 5173
```

The frontend application will be available at http://localhost:5173

- Health check page: http://localhost:5173/health

## How to set environment variables

- Create a `.env` file in the root directory
- Copy the contents of `.env.example` into `.env`
- Fill in the values
