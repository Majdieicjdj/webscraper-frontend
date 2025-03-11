document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const urlInput = document.getElementById("url-input");
    const toggleButtons = document.querySelectorAll(".toggle-btn");
    const scrapeBtn = document.getElementById("scrape-btn");
    const downloadWordBtn = document.getElementById("download-word-btn");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");
    const previewSection = document.getElementById("preview-section");
    const loadingIndicator = document.getElementById("loading-indicator");

    let currentSessionId = null; // Track session for downloads

    // Toggle selection buttons
    toggleButtons.forEach((button) => {
        button.addEventListener("click", () => button.classList.toggle("active"));
    });

    document.getElementById("select-all").addEventListener("click", () => {
        toggleButtons.forEach((button) => button.classList.add("active"));
    });

    document.getElementById("select-none").addEventListener("click", () => {
        toggleButtons.forEach((button) => button.classList.remove("active"));
    });

    // Scrape button click event
    scrapeBtn.addEventListener("click", async () => {
        const url = urlInput.value.trim();
        if (!url) {
            showNotification("Please enter a valid URL", "error");
            return;
        }

        const selectedElements = Array.from(toggleButtons)
            .filter((btn) => btn.classList.contains("active"))
            .map((btn) => btn.dataset.element);

        if (selectedElements.length === 0) {
            showNotification("Please select elements to scrape", "error");
            return;
        }

        // Show loading
        loadingIndicator.classList.add("active");
        previewSection.innerHTML = `<div class="loading-message">Scraping data...</div>`;

        try {
            const response = await fetch("http://127.0.0.1:5000/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, elements: selectedElements }),
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const result = await response.json();
            console.log("Server Response:", result);

            if (!result || result.error) {
                showNotification(`Error: ${result.error || "No data received"}`, "error");
                previewSection.innerHTML = `<div class="error-message">${result.error || "No data received"}</div>`;
                return;
            }

            if (!result.data || typeof result.data !== "object" || Object.keys(result.data).length === 0) {
                showNotification("No relevant data found on the page.", "error");
                previewSection.innerHTML = `<div class="error-message">No relevant data found.</div>`;
                return;
            }

            currentSessionId = result.session_id;
            downloadWordBtn.disabled = false;
            downloadPdfBtn.disabled = false;
            displayPreview(result);
            showNotification("Data scraped successfully!", "success");
        } catch (error) {
            console.error("Fetch Error:", error);
            showNotification("An error occurred. Please try again.", "error");
        } finally {
            loadingIndicator.classList.remove("active");
        }
    });

    // Download buttons
    const handleDownload = (type) => {
        if (!currentSessionId) {
            showNotification("Please scrape data first", "error");
            return;
        }
        window.location.href = `http://127.0.0.1:5000/api/download/${type}/${currentSessionId}`;
        showNotification(`Downloading ${type.toUpperCase()} document...`, "info");
    };

    downloadWordBtn.addEventListener("click", () => handleDownload("docx"));
    downloadPdfBtn.addEventListener("click", () => handleDownload("pdf"));

    // Display preview of scraped data
    function displayPreview(data) {
        if (!data || typeof data !== "object" || !data.data || Object.keys(data.data).length === 0) {
            previewSection.innerHTML = `<div class="error-message">No data available.</div>`;
            return;
        }

        let previewHtml = `
            <div class="preview-header">
                <h3>${data.title || "Scraped Data"}</h3>
                <div class="preview-meta">
                    <span>URL: ${data.url || "N/A"}</span>
                    <span>Time: ${data.timestamp || "N/A"}</span>
                </div>
            </div>
            <div class="preview-content">
        `;

        for (const [key, value] of Object.entries(data.data)) {
            previewHtml += `<div class="preview-section"><h4>${key.toUpperCase()}</h4>`;
            if (Array.isArray(value)) {
                previewHtml += `<ul>${value.map(item => `<li>${typeof item === 'object' ? JSON.stringify(item) : item}</li>`).join('')}</ul>`;
            } else if (typeof value === "string" || typeof value === "number") {
                const textValue = String(value);
                const maxLength = 500;
                previewHtml += `<div class="preview-text">${textValue.length > maxLength ? textValue.substring(0, maxLength) + "..." : textValue}</div>`;
            } else {
                previewHtml += `<div class="preview-text">${JSON.stringify(value, null, 2)}</div>`;
            }
            previewHtml += "</div>";
        }

        previewHtml += "</div>";
        previewSection.innerHTML = previewHtml;
    }

    // Notification system
    function showNotification(message, type) {
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add("show"), 10);
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Example URL placeholder
    urlInput.addEventListener("focus", function () {
        if (!this.value) this.placeholder = "e.g., https://example.com";
    });
});
