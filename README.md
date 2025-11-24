# AI-Powered Automated Credit & Risk Analysis Pipeline

![Status](https://img.shields.io/badge/Status-In_Development-2ea44f?style=for-the-badge)

![n8n](https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Google Drive](https://img.shields.io/badge/Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white)

A portfolio case study of an end-to-end automation system that uses Generative AI (LLMs) and Brazilian credit bureaus to deliver real-time risk analysis and power an internal approval flow.

---

### 1. The Business Problem

Traditional credit and due diligence analysis for new clients is a significant operational bottleneck for many companies.

- **It's Slow & Manual:** The process relies on senior analysts and legal teams to manually query multiple, disconnected data sources (credit bureaus, legal portals, internal blacklists).
- **It's High-Cost:** This process consumes hours of high-value employee time per analysis, diverting experts from strategic tasks.
- **It's Inconsistent:** Risk assessment can be subjective and vary between analysts, leading to inconsistent decision-making.
- **It's a Poor Experience:** The delay (which can take hours or even days) creates friction for the end customer and can lead to lost business.

### 2. The Solution: An Intelligent Automation Pipeline

I designed and implemented an intelligent, multi-workflow system. The architecture separates the initial request (the "Trigger") from the main processing logic (the "Analyzer").

1.  A **Trigger Workflow** acts as a secure front-door, authenticating incoming **WhatsApp** requests against an approved list of senders.
2.  Once authenticated, it instantly calls the main **Logic Workflow**, passing the query (CPF/CNPJ).
3.  This main workflow executes all data gathering, AI analysis, error handling, and manages the entire human-in-the-loop (HIL) approval process, communicating with both the requester and the approver.

### 3. System Architecture

The solution uses a multi-workflow architecture to ensure security, robust error handling, and a seamless user experience.

#### Workflow 1: The "Trigger" (Authentication)

- **Trigger:** Receives a message via a **WhatsApp Webhook**.
- **Logic:** Validates the requester's phone number.
- **Action:** If valid, it makes an HTTP call to trigger Workflow 2. If invalid, the flow stops.

#### Workflow 2: The "Analyzer" (Core Logic & Approval)

- **Trigger:** Receives the call from Workflow 1 via **Webhook**.
- **Data Gathering:** Executes all API calls (Credit Bureaus, Legal Sources).
- **Error Handling:** If any API fails, it immediately notifies the original **requester** via WhatsApp/Email.
- **AI Analysis:** The cleaned JSON data is sent to a **Generative AI (LLM)** to produce the expert analysis.
- **Approval Request:** The system sends a unique approval link (containing the analysis) to the designated **approver** via both **Email and WhatsApp**.
- **Pause State:** The workflow **pauses** indefinitely (using an `n8n Wait node`) until the approver submits their decision on the form.
- **Final Decision:** Once the form is submitted, the workflow resumes, logs the decision, and notifies the original **requester** (via WhatsApp/Email) that the process is complete.

### 4. Tech Stack

This project was built using a modern, integration-focused stack.

| Category                       | Technologies                                                              |
| :----------------------------- | :------------------------------------------------------------------------ |
| **Automation & Orchestration** | **n8n** (cloud version)                                                   |
| **Core Logic & Data**          | **JavaScript (Node.js)** for data transformation                          |
| **AI Analysis**                | **Generative AI (LLMs)** via API (e.g., OpenAI, Anthropic, Google)        |
| **AI Prompting**               | Advanced **Prompt Engineering** for structured analysis and HTML output   |
| **Data Sources & APIs**        | **REST APIs** for major **Brazilian Credit Bureaus** (e.g., Serasa, SCPC) |
|                                | **REST APIs** for legal/public data (e.g., Escavador)                     |
| **Storage**                    | **Google Drive API** (for robust, large-file storage)                     |
| **Interface & Triggers**       | **WhatsApp** (via Webhook)                                                |
| **Approval Interface**         | **n8n Forms** (dynamic web-based dashboard)                               |

### 5. Key Technical Features & Challenges

The core challenge was not just connecting APIs, but handling and interpreting massive, complex data payloads intelligently.

- **Dynamic JSON Sanitization:**

  - Developed a JavaScript module to parse, clean, and structure massive JSON responses (often +50,000 characters) from credit bureaus in real-time.
  - This script removes thousands of irrelevant metadata tags (`<TAMANHOREGISTRO>`, etc.) and flattens the nested structure, making it clean and token-efficient for the AI to analyze.
  - _(See: `/code-samples/json_cleaner_sample.js`)_

- **AI-as-Analyst (Advanced Prompt Engineering):**

  - Engineered a sophisticated, multi-part prompt that instructs the LLM to act as a senior legal analyst, not just a summarizer.
  - The prompt forces the AI to perform qualitative, temporal, and risk-based analysis (e.g., "Are the debts recent?", "What is the total risk value?", "Are the creditors banks or retail?").
  - Includes strict output formatting rules, forcing the AI to generate a clean, safe HTML fragment (`<b>`, `<ul>`, `<h2>`) to be rendered in the final form.
  - _(See: `/code-samples/ai_analyst_prompt_template.md`)_

- **Stateful "Human-in-the-Loop" (HIL) Logic:**
  - Architected a robust logic workflow that manages the entire process state, from the initial API calls to the final human decision, within a single execution.
  - The workflow uses the **n8n "Wait" (On form submission) node** to indefinitely pause the execution after sending the analysis to the approver (via Email and WhatsApp).
  - This "stateful" approach consumes minimal resources while waiting (hours or days) for the human input.
  - Once the form is submitted, the _same_ workflow instance resumes, ensuring all original data and context are available to complete the final notification steps to the requester.

### 6. Project Status

This repository serves as a **Portfolio Case Study**. The complete, proprietary workflows are not public, but the architecture, logic, and key code samples are available here to demonstrate the technical and business solution.

---

### 8. Author

- **Thiago de Almeida Louzada**
- [LinkedIn Profile](https://www.linkedin.com/in/thiago-de-almeida-louzada/)
- [GitHub Profile](https://github.com/TALouzada)

