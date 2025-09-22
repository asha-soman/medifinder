# MediFinder — Healthcare Appointment & Records System
# ####################################################

# PROJECT OVERVIEW

MediFinder is a healthcare appointment and medical records management system.

The system allows:
Patients to register, manage their profiles, search doctors, book/edit/cancel appointments, and view their medical history.
Doctors to manage availability, view schedules, record prescriptions, and access patient histories.

# This project demonstrates:

    1. Software Requirements Specification (SRS)
    2. UI/UX Design (Figma)
    3. Object-Oriented Programming principles
    4. 7 Design Patterns
    5. Version control & collaboration (GitHub)
    6. Unit testing (Mocha/Chai) & API testing (Postman)
    7. CI/CD pipeline with GitHub Actions & AWS EC2


# REPOSITORY STRUCTURE

medifinder/
├─ backend/          # Node.js + Express + MongoDB backend
│  ├─ routes/        # API routes
│  ├─ controllers/   # Handle requests, call services
│  ├─ services/      # Business logic (OOP + patterns)
│  ├─ models/        # Mongo models
│  ├─ middleware/    # Express middlewares (Chain of Responsibility is implemented here)
│  ├─ shared/        # Design Patterns (Factory, Strategy, Observer, Proxy, Facade, Decorator)
│  ├─ config/        # DB & logger file
│  ├─ test/          # Mocha/Chai unit tests
│  └─ postman/       # Postman collection & environment
│
├─ frontend/         # React frontend
│  ├─ src/           # Pages, components, API 
│  └─ public/        # Static assets
│
├─ .github/workflows # CI/CD pipeline YAML
└─ README.md         # Project documentation


# Technology Stack

    1. Backend: Node.js, Express.js, MongoDB
    2. Frontend: React.js 
    3. Authentication: JWT (role-based access: Patient, Doctor)
    4. Testing: Mocha + Chai (unit tests), Postman (API tests)
    5. Deployment: AWS EC2, PM2, GitHub Actions CI/CD
    6. Collaboration: GitHub (branches, PRs, code reviews, conflict resolution)
    7. Design & Prototype: Figma


# Features

Patient
    1. Register/Login, role-based dashboard
    2. Manage profile
    3. Search doctors (by name, specialization)
    4. Book, update, cancel appointments
    5. View upcoming & past appointments
    6. View medical records

Doctor
    1. Register/Login, role-based dashboard
    2. Manage profile
    3. Add/edit/delete availability
    4. View daily/weekly schedule
    5. Add/edit/delete patient records & prescriptions
    6. View patient histories

Shared
    1. Notifications for booking changes
    2. Role-based access control
    3. Audit logging for profile & records


# Implemented Design Patterns

    1. Factory - Create Patient/Doctor objects on signup
    2. Strategy - Doctor search (name/specialty) & appointment filtering (upcoming/past)
    3. Chain of Responsibility - Middleware pipelines for validation, auth, error handling
    4. Observer - EventBus triggers notifications on booking/profile/availability changes
    5. Proxy - Control access to sensitive patient records (RBAC)
    6. Facade - Simplified views (doctor directory, doctor schedule, patient history)
    7. Decorator - Audit/versioning for profile updates and record modifications


# Testing

    1. Unit Testing (Mocha/Chai): 
            Screenshots of passing tests for authentication, booking, availability, records, and profiles.
    2. API Testing (Postman):
            Collection with CRUD requests (login, appointments, records, notifications).


# Links
    1. Figma Design: 
    2. Postman Collection: 
    3. GitHub Repo: 
    4. Deployed App (EC2 Public IP): 


# Login Credentials 

Email: 
Password: 


# Project Set Up Instructions
1. Clone the repository from 
2. Connect to MongoDB
3. Edit .env file with your values
4. Run `npm run install-all`
4. Run `npm run start`