
# MediTrack – Unified Digital Healthcare Platform

MediTrack is a web-based Hospital Management System designed to simplify healthcare operations by connecting patients, doctors, and pharmacies through a unified digital platform.

The platform aims to make healthcare services more accessible and organized through features such as online appointment booking, digital prescription management, real-time notifications, and QR-based prescription access.

---

## 📌 Project Overview

Traditional healthcare management often involves disconnected processes for appointments, prescriptions, and communication between patients, doctors, and pharmacies.

MediTrack addresses these challenges by providing a centralized platform where different healthcare stakeholders can interact efficiently.

The system consists of three primary modules:

- **Patient Module:** Allows patients to manage their healthcare interactions.
- **Doctor Module:** Enables doctors to manage appointments, patients, and prescriptions.
- **Pharmacy Module:** Allows pharmacies to access prescriptions securely through QR codes.

---

## ✨ Features

### 👤 Patient Module
- Patient registration and login.
- Book doctor appointments.
- Manage patient information.
- View digital prescriptions.
- Receive real-time notifications.

### 🩺 Doctor Module
- Doctor authentication.
- Dedicated doctor dashboard.
- View and manage appointments.
- Access relevant patient information.
- Create and manage digital prescriptions.
- Receive appointment-related notifications.

### 💊 Pharmacy Module
- Pharmacy login and authentication.
- Scan QR codes to access prescriptions.
- View only the current prescription associated with the QR code.
- Request alternative medicines.
- Restricted access to patient information to support privacy.

### 🔐 Security & Data Management
- Firebase Authentication for user authentication.
- Cloud Firestore for database management.
- Access restrictions for different user roles.
- Firebase Security Rules for controlling database access.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Structure of the web application |
| CSS3 | Styling and layouts |
| JavaScript | Frontend functionality |
| Firebase Authentication | User authentication |
| Cloud Firestore | Database management |
| Firebase Hosting | Application deployment |
| QR Code | Prescription identification and access |

---

## 🏗️ Project Structure

```text
MediTrack/
│
├── MediTrack/                  # Main application directory
│   │
│   ├── Day - Night Button/
│   ├── Doctor/
│   ├── Firebase/
│   ├── Patient/
│   ├── Pharmacy/
│   │   └── Pharmacy_Login_Page/
│   ├── Prescription_View/
│   ├── assets/
│   │
│   ├── .firebaserc
│   ├── .gitignore
│   ├── 404.html
│   ├── firebase.json
│   ├── Index.html
│   ├── Script.js
│   └── style.css
│
├── screenshots/                # Application screenshots
│
└── README.md
```

---

## ⚙️ Installation & Setup

Follow these steps to run MediTrack locally.

### 1. Clone the repository

```bash
git clone https://github.com/Ramkrishna87/MediTrack.git
```

### 2. Navigate to the application directory

```bash
cd MediTrack/MediTrack
```

### 3. Configure Firebase

To run the application with your own Firebase project:

- Create a project in the Firebase Console.
- Enable Firebase Authentication.
- Set up Cloud Firestore.
- Configure the necessary Firestore Security Rules.
- Configure the Firebase Web SDK in the application using your project's configuration.

**Important:** Never upload Firebase service-account private keys, private credentials, or other sensitive secrets to a public GitHub repository.

### 4. Run the application

- Open the application directory in Visual Studio Code.
- Install the Live Server extension if required.
- Open `Index.html`.
- Right-click and select **Open with Live Server**.

**Note:** Some Firebase features require a correctly configured Firebase project and appropriate security rules.

---

## 🔄 Application Workflow

1. Patients register or log in to the platform.
2. Patients book appointments with doctors.
3. Doctors manage appointments and access relevant patient information.
4. Doctors create digital prescriptions.
5. Prescriptions are made accessible through QR-based identification.
6. Pharmacies scan the QR code to view the relevant prescription.
7. Pharmacies can request alternative medicines when required.

---

## 📸 Screenshots

Screenshots of the MediTrack application will be added here to demonstrate its user interface and major modules.

### Homepage
![MediTrack Homepage](screenshots/homepage.png)

### Patient Dashboard
![Patient Dashboard](screenshots/patient-dashboard.png)

### Doctor Dashboard
![Doctor Dashboard](screenshots/doctor-dashboard.png)

### Pharmacy Dashboard
![Pharmacy Dashboard](screenshots/pharmacy-dashboard.png)

---

## 🔮 Future Enhancements

- Online payment integration.
- Video consultations between patients and doctors.
- Medicine availability tracking.
- Advanced appointment scheduling.
- Improved analytics and reporting.
- Further enhancements to security and data privacy.
- Mobile application integration.

---

## 🎓 Academic Project

MediTrack was developed as an academic project as part of the Bachelor of Computer Applications (BCA) program at Manipal University Jaipur.

The project focuses on applying web development and cloud-based technologies to solve practical challenges in healthcare management.

---

## 👨‍💻 Developer

**Ramkrishna Nityanand Pujari**

- **GitHub:** [Ramkrishna87](https://github.com/Ramkrishna87)
- **LinkedIn:** [Ramkrishna Pujari](https://www.linkedin.com/in/ramkrishna-pujari-99626a342/)

---

## 📄 License

This project is developed for academic and educational purposes.
