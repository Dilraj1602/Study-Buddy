# 📚 StudyTrack (Study-Buddy)

A modern full-stack web application designed to help you **track study sessions, stay consistent, and analyze progress** — while also providing a **chatbot companion** for interactive study support.  

---

## ✨ Features

- 🔑 **User Authentication**: Secure login, registration, and logout with JWT and cookies.  
- ✅ **Task Management**: Add, edit, and delete daily study logs with duration tracking.  
- 🌍 **Global Context API**: Centralized state management for tasks and analytics.  
- 📊 **Study Analytics**:  
  - Total tasks completed  
  - Total study time  
  - Last activity timestamp  
  - Average duration across **weekly, monthly, 6-monthly, yearly, and all-time** ranges  
- 🤖 **Chatbot Integration**: Get AI-powered assistance to stay motivated, resolve doubts, or receive study tips.  
- 📱 **Responsive UI**: Clean and user-friendly interface using React + Tailwind.  
- ⚡ **AI Insights Module**: Local analytics inspired by AI to give personalized insights without external API dependency.  

---

## 🛠️ Tech Stack

- **Frontend**: React, Axios, React Router, Tailwind CSS  
- **Backend**: Node.js, Express, MongoDB, Mongoose  
- **Authentication**: JWT & Cookies  
- **State Management**: React Context API, Custom Hooks  
- **Chatbot**: Integrated with frontend for interactive study help  

---

## 📦 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Dilraj1602/Study-Buddy.git
cd Study-Buddy
```

### 2. Install dependencies
#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd ../client
npm install
```

### 3. Configure environment variables
Create a `.env` file in the `server/` directory with:
```
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
PORT=4000
```

### 4. Run the backend
```bash
cd server
npm start
```

### 5. Run the frontend
```bash
cd ../client
npm start
```

Your app will be live at: **http://localhost:3000**

---

## 🚀 Usage Guide

- 🔐 **Login/Register**: Create an account or sign in.  
- 📝 **Manage Tasks**: Add, edit, or delete study tasks with time duration.  
- 📈 **View Analytics**: Track weekly/monthly/yearly averages, total hours, and streaks.  
- 🤖 **Use the Chatbot**: Ask study-related queries, get motivational messages, or track your goals interactively.  
- 📊 **Check Dashboard**: Access complete statistics and performance insights.  

---

## 📂 Folder Structure

```
Study-Buddy/
├── client/      # React frontend with chatbot & dashboard
└── server/      # Node.js/Express backend APIs with MongoDB
```

---

## 🤝 Contributing

Contributions are welcome!  
1. Fork this repository  
2. Create your feature branch (`git checkout -b feature/YourFeature`)  
3. Commit your changes (`git commit -m "Add new feature"`)  
4. Push to your branch (`git push origin feature/YourFeature`)  
5. Open a Pull Request 🚀  

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).  

---

## 🎯 Future Goals

- 📈 **User Streak Graph**: Visualize study streaks with interactive charts to motivate consistency.  
- ⏳ **Daily Study Limit**: Set a daily limit for study hours with alerts when exceeded.  

---

💡 *Made with passion to keep learning engaging, consistent, and fun!*  
