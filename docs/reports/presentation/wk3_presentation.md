### **Demo & Presentation Plan: Week 3**

---

#### **1. Team Lead** (@ben-blake)

- **Intro:** "Good morning. This week, we solidified our foundation. We tackled critical issues in our CI/CD pipeline and data handling, moving to a stable, automated, and more flexible system. This was crucial for unblocking the team and ensuring quality moving forward."
- **Handoffs:** Introduce each team member and their area of contribution for the week.
- **Conclusion & Next Steps:** "To summarize, we now have a stable build process and a more realistic data schema. With this solid base, our goal for Week 4 is to begin implementing some more core features and agents for the system."

---

#### **2. DevOps** (@mukunda5125)

- **What I did:** "My focus was on our CI pipeline. I diagnosed and resolved failures in the backend, frontend, and secret scanning jobs. This involved correcting linting configurations, fixing dependency issues, and properly integrating our secret scanning tool with GitHub Actions."
- **The Impact:** "We now have a green build. Every code change is automatically tested and validated, which allows the entire team to build and deploy with confidence."

---

#### **3. Backend/Agents** (@bhavani-adula)

- **What I did:** "I addressed the data import errors by making our backend smarter. I updated our database model to handle a wider variety of asset types, moving from a rigid list to a flexible text field. I then generated a new database migration to apply this schema change."
- **The Impact:** "The application is no longer brittle. We can now import a more realistic and diverse set of assets without the backend rejecting them, which is essential for building a useful risk model."

---

#### **4. Frontend** (@srujanareddykunta)

- **What I did:** "I modernized our frontend development process to fix the failing build. This involved upgrading our linting configuration to the latest ESLint standards and, most importantly, implementing a strict type system. I defined clear data types for our `Assets` and `Intel` and eliminated all 'any' types from our pages."
- **The Impact:** "Our frontend code is now more reliable and easier to maintain. This type safety prevents common bugs and will make adding new features much faster."

---

#### **5. Data/Detection** (@tinana2k)

- **What I did:** "To properly test our system, we need realistic data. I overhauled our `sample_assets.csv` file, expanding it from two basic entries to a diverse list of 13 assets. This now includes firewalls, laptops, and cloud services, reflecting a real-world corporate environment."
- **The Impact:** "This richer dataset allows us to build and test more meaningful detection and risk-scoring logic. It's the fuel for our intelligence engine."

---

#### **6. Risk & Compliance** (@geethspadamati)

- **What I did:** "My focus was on data integrity, which is the foundation of accurate risk assessment. The initial data import was failing because of invalid values. I worked with the backend team to ensure our validation rules for fields like `Data Sensitivity` are clear and correctly enforced, ensuring all incoming data is compliant with our schema."
- **The Impact:** "We can trust the data in our system. This ensures that our risk calculations are based on accurate, validated information, which is critical for compliance."
