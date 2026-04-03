# 🚀 AI Tech News - Full-Stack Cloud-Native Architecture

A fully automated AI news aggregation system built entirely on **Amazon Web Services (AWS)**. This project leverages the synergy between **Serverless architecture** and **EC2 instances** to optimize performance, security, and automated data scraping workflows.

## 🏗️ System Architecture
The project implements an **Event-Driven Cloud Architecture**, where scheduled events trigger automated data processing pipelines.



### **1. Core Layers**

* **Edge Layer:**
    * **Amazon CloudFront:** Acts as the entry point for HTTPS requests, performing **Path-based routing** to distribute traffic between S3 (Frontend) and EC2 (Backend API).
* **Automation Layer:**
    * **Amazon EventBridge:** Functions as the "alarm clock" of the system. It is configured with a **Cron job** to send trigger signals every 1-2 hours.
    * **AWS Lambda:** A serverless function that reacts to EventBridge signals to perform web scraping from various AI news sources, subsequently storing the data directly into DynamoDB.
* **Persistence Layer:**
    * **Amazon DynamoDB:** A NoSQL database storing news articles. It allows Lambda to write data and EC2 to read data simultaneously with ultra-low latency.
* **Compute & Storage Layer:**
    * **Amazon S3:** Hosts the static user interface (Static Assets).
    * **Amazon EC2:** Runs a **Node.js Express** server to serve API queries from end-users.

---

## ⚡ Key Features

* **Full Automation:** By combining **EventBridge** and **Lambda**, news data is refreshed continuously without manual intervention or wasting background resources on the EC2 instance.
* **Unified Domain:** CloudFront merges S3 and EC2 into a single domain, eliminating **CORS** issues and providing native **HTTPS (SSL)** support.
* **Cost & Resource Optimization:**
    * **Lambda** only incurs costs during execution (seconds per scrape).
    * **EC2 Spot Instances** reduce server costs by up to 90%.
    * **S3 and DynamoDB** operate within the AWS Free Tier.
* **Decoupled Architecture:** Separating the scraping task (Lambda) from the user-serving task (EC2) ensures extreme stability; if the Backend API encounters an issue, the scraping workflow remains unaffected.

---

## 🔌 Communication Protocols
The system establishes data "pipelines" through industry-standard protocols:

| Connection Flow | Protocol | Description |
| :--- | :--- | :--- |
| **User ↔ CloudFront** | **HTTPS (TLS 1.3)** | Secures end-user data. |
| **EventBridge ↔ Lambda** | **AWS Internal Event** | Triggers the scraper function on a schedule. |
| **Lambda ↔ DynamoDB** | **HTTPS (AWS SDK)** | Writes new articles into the database. |
| **EC2 ↔ DynamoDB** | **HTTPS (AWS SDK)** | Retrieves news to serve to users. |
| **CloudFront ↔ EC2/S3** | **HTTP** | Forwards requests to the respective origins. |

---

## 📊 Automated Data Flow

### **A. Background Collection Phase**
1.  **EventBridge** triggers **Lambda** based on a schedule.
2.  **Lambda** scrapes news from the internet → Normalizes data → Saves to **DynamoDB**.



### **B. User Access Phase**
1.  The user accesses **CloudFront**.
2.  **If calling `/api/news`**: CloudFront routes the request to **EC2** → EC2 fetches data from **DynamoDB** → Returns JSON.
3.  **If accessing the homepage**: CloudFront fetches files from **S3** and returns them to the browser.
## **DEMO UI**
### **Homepage**
![AI Tech News web interface](image/demoUI.png)
### **LLM Leaderboard**
![LLM Leaderboard feature (OpenRouter popular models)](image/demolb.png)
