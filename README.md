# Project Name: Splitty
## General Concept:
The application allows groups of people (friends, roommates, travelers) to track shared expenses. The system automatically calculates "who owes whom" and how much, always seeking the "minimum payment path" to settle debts efficiently.

## How would the flow look?
Frontend (React/Angular/Vue): The user fills out a form: "Pizza Night - $60 - Paid by: You - Split among: Ana and Luis."

Backend (Node/Python/Java): Receives the data, calculates that Ana owes 20 and Luis owes 20, and updates the group's general balances.

## Database: Maintains a historical record so there are no "I didn't know" excuses.

## Features:
Reminders: "Rent is due in 2 days."

## Data Model:
Users: ID, name, email, avatar.

Groups: ID, name, description.

Expenses: ID, amount, description, paid_by (User_ID), Group_ID.

Debt_Splits: The junction table connecting who owes what for each specific expense.

## The Technical Challenge:
The most difficult and valuable part of this project is the Debt Simplification Algorithm.

## Example: 
If Ana owes Beto $10, and Beto owes Carlos $10, the system should be able to say: "Ana pays Carlos $10 directly" to avoid unnecessary transactions.

Implementing this logic in your Backend demonstrates high-level complex algorithm resolution skills.

# Roadmap – User Stories (Splitty)
## Feature Development Timeline
### Phase 1: Creation and Initial Organization
#### 🟩 US01 – Create Group
Group name

Category

Invitation link

Add members

#### 🟩 US02 – Add Expense
Amount, description, "who paid"

Automatic equal split

Editable date

### Phase 2: Evidence Management and Visualization
#### 🟦 US03 – Attach Receipt
JPG/PNG/PDF upload

Full-size viewing

Cloud storage integration

#### 🟦 US04 – View Balances
Total balance visible

Color coding (Red/Green)

Breakdown by person

### Phase 3: Personalization and Financial Adjustments
#### 🟨 US05 – Unequal Split
Split by percentage, exact amount, or shares

Total sum validation

#### 🟨 US06 – Record Payment
Select recipient

Push notification

Real-time balance update

### Phase 4: Optimization and Advanced Features
#### 🟧 US07 – Simplify Debts
Cross-settlement algorithm

Toggle on/off per group

#### 🟧 US08 – Multi-currency
Currency selector

Exchange rate API

Automatic conversion

### Phase 5: Control and Auditing
#### 🟥 US09 – History/Activity Log
Chronological record

User, action, and timestamp

"Undo" option

## Visual Representation (Linear Schema)
Start → [US01] → [US02] → [US03] → [US04] → [US05] → [US06] → [US07] → [US08] → [US09] → End

## Potential External APIs:
### 1. Image Management (Receipts & Avatars)
Cloudinary (Recommended): The "gold standard" for student projects. It has an easy-to-use Python SDK and can handle resizing automatically.

Firebase Storage: A solid alternative if you are already using Firebase for Authentication.

### 2. Currency Conversion (US08)
ExchangeRate-API: Very stable with a generous free plan (1,500 requests/month).

Fixer.io: Professional grade, though the free plan is sometimes restricted to EUR as the base currency.

### 3. Notifications and Real-Time (US06)
Pusher (Recommended): Perfect for final projects as it eliminates the complexity of manual WebSockets.

Brevo (Email): Great for invitation emails; the free tier allows 300 emails per day.

### 4. Payment Gateway (Optional but "Pro")
PayPal Sandbox: Universal for demonstrating international payment flows.

Stripe (Test Mode): Best documentation in the world. Even if restricted for live accounts in some regions, Test Mode works perfectly for a project defense.

Where to start?
My advice is to divide the work immediately:

Backend: Someone should start defining the SQLAlchemy models and Auth routes (JWT).

Frontend: Someone should mockup the "Add Expense" form, which is the most complex part of the UI due to the unequal split logic.

-------------------------------------------------------------------------------------------------------------------------------------------
# WebApp boilerplate with React JS and Flask API

Build web applications using React.js for the front end and python/flask for your backend API.

- Documentation can be found here: https://4geeks.com/docs/start/react-flask-template
- Here is a video on [how to use this template](https://www.loom.com/share/f37c6838b3f1496c95111e515e83dd9b)
- Integrated with Pipenv for package managing.
- Fast deployment to Render [in just a few steps here](https://4geeks.com/docs/start/deploy-to-render-com).
- Use of .env file.
- SQLAlchemy integration for database abstraction.

### 1) Installation:

> If you use Github Codespaces (recommended) or Gitpod this template will already come with Python, Node and the Posgres Database installed. If you are working locally make sure to install Python 3.10, Node 

It is recomended to install the backend first, make sure you have Python 3.10, Pipenv and a database engine (Posgress recomended)

1. Install the python packages: `$ pipenv install`
2. Create a .env file based on the .env.example: `$ cp .env.example .env`
3. Install your database engine and create your database, depending on your database you have to create a DATABASE_URL variable with one of the possible values, make sure you replace the valudes with your database information:

| Engine    | DATABASE_URL                                        |
| --------- | --------------------------------------------------- |
| SQLite    | sqlite:////test.db                                  |
| MySQL     | mysql://username:password@localhost:port/example    |
| Postgress | postgres://username:password@localhost:5432/example |

4. Migrate the migrations: `$ pipenv run migrate` (skip if you have not made changes to the models on the `./src/api/models.py`)
5. Run the migrations: `$ pipenv run upgrade`
6. Run the application: `$ pipenv run start`

> Note: Codespaces users can connect to psql by typing: `psql -h localhost -U gitpod example`

### Undo a migration

You are also able to undo a migration by running

```sh
$ pipenv run downgrade
```

### Backend Populate Table Users

To insert test users in the database execute the following command:

```sh
$ flask insert-test-users 5
```

And you will see the following message:

```
  Creating test users
  test_user1@test.com created.
  test_user2@test.com created.
  test_user3@test.com created.
  test_user4@test.com created.
  test_user5@test.com created.
  Users created successfully!
```

### **Important note for the database and the data inside it**

Every Github codespace environment will have **its own database**, so if you're working with more people eveyone will have a different database and different records inside it. This data **will be lost**, so don't spend too much time manually creating records for testing, instead, you can automate adding records to your database by editing ```commands.py``` file inside ```/src/api``` folder. Edit line 32 function ```insert_test_data``` to insert the data according to your model (use the function ```insert_test_users``` above as an example). Then, all you need to do is run ```pipenv run insert-test-data```.

### Front-End Manual Installation:

-   Make sure you are using node version 20 and that you have already successfully installed and runned the backend.

1. Install the packages: `$ npm install`
2. Start coding! start the webpack dev server `$ npm run start`

## Publish your website!

This boilerplate it's 100% read to deploy with Render.com and Heroku in a matter of minutes. Please read the [official documentation about it](https://4geeks.com/docs/start/deploy-to-render-com).

### Contributors

This template was built as part of the 4Geeks Academy [Coding Bootcamp](https://4geeksacademy.com/us/coding-bootcamp) by [Alejandro Sanchez](https://twitter.com/alesanchezr) and many other contributors. Find out more about our [Full Stack Developer Course](https://4geeksacademy.com/us/coding-bootcamps/part-time-full-stack-developer), and [Data Science Bootcamp](https://4geeksacademy.com/us/coding-bootcamps/datascience-machine-learning).

You can find other templates and resources like this at the [school github page](https://github.com/4geeksacademy/).
