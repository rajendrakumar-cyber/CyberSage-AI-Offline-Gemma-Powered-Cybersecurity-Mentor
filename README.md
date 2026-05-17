# CyberSage AI — Offline-First Cybersecurity Mentor

CyberSage AI is a secure, privacy-centric training application designed to close the global cybersecurity skills gap. It provides expert security mentorship, log diagnostics, and custom-tailored practical exercises.

## 🚀 Features
- **Multimodal Threat Analysis**: Upload logs, screenshots, or configuration files for instant pedagogical breakdown.
- **Automated Lab Generation**: Generates "Safe Practice Labs" based on real analyzed incidents.
- **Secure Persistence**: Uses a local-first memory logic (implemented via Firestore for cloud sync) to maintain context across sessions.
- **Professional Dashboard**: Real-time system telemetry and an educational roadmap.

## 🛠️ Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, Motion.
- **Backend**: Node.js, Express.
- **AI**: Gemini 3 Flash (configured with CyberSage Reasoning tags).
- **Database/Auth**: Firebase (Firestore & Auth).

## 📦 Local Setup (Reference)

### For the provided Node.js Implementation:
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment Configuration**:
   Create a `.env` file with your `GEMINI_API_KEY`.
3. **Run Development Server**:
   ```bash
   npm run dev
   ```

### For a Python/FastAPI Alternative (Conceptual):
1. **Install Requirements**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Run Server**:
   ```bash
   uvicorn main:app --reload
   ```

## 📝 Usage
1. **Authenticate**: Register a secure agent ID.
2. **Input Data**: Paste raw logs or upload an incident screenshot.
3. **Analyze**: The engine will execute a reasoning chain and provide a:
   - Threat Breakdown
   - Immediate Fix
   - Learning Challenge
   - Lab Suggestion
