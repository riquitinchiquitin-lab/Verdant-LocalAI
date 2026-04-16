# Verdant - Botanical Management Protocol

Verdant is a high-precision botanical management system designed for professional and enthusiast plant collectors. It provides a robust framework for tracking, maintaining, and optimizing the health of botanical specimens across multiple properties.

## 🌿 Core Features

### 1. Specimen Management
- **Detailed Dossiers**: Maintain comprehensive records for every plant, including species, variety, and origin.
- **Priority Specimens**: Designate high-value specimens as "Priority" to highlight them on your dashboard and ensure they receive top-tier care.
- **Visual Tracking**: Upload and store high-resolution images of your plants to track growth and health over time.

### 2. Automated Care Protocol
- **Intelligent Task Generation**: The system automatically generates maintenance tasks (watering, rotating, fertilizing, repotting) based on species-specific requirements and historical data.
- **Hydration Monitoring**: Real-time tracking of hydration levels with visual progress bars and "Thirsty" status alerts.
- **Maintenance Logs**: Log every action (watering, moisture checks, phenophase changes) with automated multi-language note generation.

### 3. Hybrid AI Architecture
- **Cloud Intelligence (Gemini)**: Leverages Google Gemini Cloud for expert pruning advice and complex vision analysis.
- **Local On-Device AI**: Utilizes **Gemini Nano** or **WebGPU** for instant, private data synthesis, translation, and health diagnosis. No cloud tokens required for daily logic.
- **Automated Identification**: Sync specimen data using Pl@ntNet vision, then refine and harmonize the record using the local high-performance model.

### 4. Multi-Property Infrastructure
- **Property Isolation**: Manage multiple houses or properties within a single interface.
- **Role-Based Access Control (RBAC)**: 
  - **Owner/CO-CEO**: Full system access and property management.
  - **Lead Hand**: Manage specific properties and personnel.
  - **Gardener**: Log data and complete maintenance tasks.
  - **Seasonal**: Read-only access for temporary staff.

### 5. Advanced Operations
- **Inventory Management**: Track botanical supplies, fertilizers, and equipment across all locations.
- **QR/Barcode Synchronization**: Quickly sync and identify specimens using integrated QR scanning.
- **Data Export**: Export specimen data to Niimbot-compatible Excel formats for professional label printing.
- **System Telemetry**: Monitor system health, API distribution, and **Local AI throughput** through integrated telemetry dashboards.

### 6. Security & Reliability
- **Military-Grade Encryption**: All data payloads are secured using AES-256-GCM encryption. See the **[Security Protocol (SECURITY.md)](./SECURITY.md)** for more details.
- **Vault Protocol**: Secure management of API keys and sensitive system configurations.
- **Backup & Restore**: Comprehensive system-wide backup and restoration capabilities to ensure data integrity.

### 7. Global Accessibility
- **11-Language Support**: Fully localized in English, Chinese, Japanese, Korean, Spanish, French, Portuguese, German, Indonesian, Vietnamese, and Tagalog.
- **Progressive Web App (PWA)**: Installable on mobile and desktop devices for offline access and real-time notifications.
- **Hardware Acceleration**: High-performance local AI operations optimized for **Pixel 9 Pro (Tensor G4)** and **iPhone 16 Pro (A18 Pro)** families.

## 🚀 Getting Started
For detailed installation instructions, including prerequisites and API key setup, please refer to the **[Installation Guide (INSTALL.md)](./INSTALL.md)**.

### Proxmox Installation
For users running Proxmox VE, we provide a helper script to quickly set up a dedicated LXC for Verdant. See the **[Proxmox Guide (PROXMOX.md)](./PROXMOX.md)** for details.

## 📄 License
This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.

### Credits & Acknowledgments
Verdant is made possible through the integration of several powerful botanical and AI technologies:
- **AI Engine**: Hybrid Cloud/Local architecture built with **Google Gemini Studio** and on-device **WebGPU/Prompt API**.
- **Botanical Data**: Powered by open-source APIs from **PlantNet**, **Trefle**, and **OpenPlantBook**.
- **Search Intelligence**: Grounding and discovery provided by **Serper**.

- **Attribution**: You must give appropriate credit (Creator: Yan Boily), provide a link to the license, and indicate if changes were made.
- **Non-Commercial**: You may not use the material for commercial purposes.

For more details, please refer to the [LICENSE.md](./LICENSE.md) file.

---
*Verdant: Precision Care for the Modern Collector.*

