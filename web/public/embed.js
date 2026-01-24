/**
 * Nexus Embed SDK
 * Lightweight vanilla JavaScript for embedding Nexus widgets on external sites
 *
 * Usage:
 * <div id="nexus-widget" data-api-key="nx_..." data-server="https://your-nexus.com"></div>
 * <script src="https://your-nexus.com/embed.js"></script>
 */

(function () {
  "use strict";

  const EMBED_VERSION = "1.0.0";
  const DEFAULT_REFRESH_INTERVAL = 60; // seconds

  class NexusEmbed {
    constructor(element, options = {}) {
      this.element = element;
      this.apiKey = options.apiKey || element.getAttribute("data-api-key");
      this.serverUrl =
        options.serverUrl ||
        element.getAttribute("data-server") ||
        window.location.origin;
      this.refreshInterval =
        parseInt(
          options.refreshInterval || element.getAttribute("data-refresh"),
        ) || null;
      this.theme =
        options.theme || element.getAttribute("data-theme") || "light";
      this.embedId = options.embedId || element.getAttribute("data-embed-id");

      this.data = null;
      this.refreshTimer = null;
      this.isLoading = false;

      if (!this.apiKey) {
        this.renderError("API key is required");
        return;
      }

      this.init();
    }

    async init() {
      // Apply base styles
      this.applyBaseStyles();

      // Initial load
      await this.fetchData();

      // Start auto-refresh if configured
      if (this.refreshInterval && this.refreshInterval > 0) {
        this.startAutoRefresh();
      }
    }

    applyBaseStyles() {
      this.element.classList.add("nexus-embed");
      this.element.setAttribute("data-theme", this.theme);

      // Inject CSS if not already present
      if (!document.getElementById("nexus-embed-styles")) {
        const style = document.createElement("style");
        style.id = "nexus-embed-styles";
        style.textContent = `
          .nexus-embed {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 100%;
          }
          .nexus-embed[data-theme="light"] {
            background: #ffffff;
            color: #1a1a1a;
          }
          .nexus-embed[data-theme="dark"] {
            background: #1a1a1a;
            color: #ffffff;
          }
          .nexus-embed-loading {
            text-align: center;
            padding: 24px;
            opacity: 0.7;
          }
          .nexus-embed-error {
            color: #ef4444;
            padding: 16px;
            border: 1px solid #ef4444;
            border-radius: 4px;
            background: rgba(239, 68, 68, 0.1);
          }
          .nexus-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
            margin-top: 12px;
          }
          .nexus-service-card {
            padding: 12px;
            border-radius: 6px;
            border: 1px solid;
            text-align: center;
            transition: transform 0.2s;
          }
          .nexus-service-card:hover {
            transform: translateY(-2px);
          }
          .nexus-embed[data-theme="light"] .nexus-service-card {
            border-color: #e5e7eb;
            background: #f9fafb;
          }
          .nexus-embed[data-theme="dark"] .nexus-service-card {
            border-color: #374151;
            background: #111827;
          }
          .nexus-service-icon {
            width: 32px;
            height: 32px;
            margin: 0 auto 8px;
          }
          .nexus-service-name {
            font-weight: 500;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .nexus-service-status {
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 12px;
            display: inline-block;
          }
          .nexus-status-up {
            background: #10b981;
            color: white;
          }
          .nexus-status-down {
            background: #ef4444;
            color: white;
          }
          .nexus-status-unknown {
            background: #6b7280;
            color: white;
          }
          .nexus-metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 16px;
            margin-top: 12px;
          }
          .nexus-metric {
            text-align: center;
            padding: 16px;
            border-radius: 6px;
          }
          .nexus-embed[data-theme="light"] .nexus-metric {
            background: #f9fafb;
          }
          .nexus-embed[data-theme="dark"] .nexus-metric {
            background: #111827;
          }
          .nexus-metric-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .nexus-metric-label {
            font-size: 12px;
            opacity: 0.7;
            text-transform: uppercase;
          }
          .nexus-uptime-list {
            margin-top: 12px;
          }
          .nexus-uptime-item {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .nexus-embed[data-theme="light"] .nexus-uptime-item {
            background: #f9fafb;
          }
          .nexus-embed[data-theme="dark"] .nexus-uptime-item {
            background: #111827;
          }
          .nexus-uptime-percentage {
            font-weight: 600;
            font-size: 16px;
          }
          .nexus-embed-footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid;
            font-size: 11px;
            text-align: center;
            opacity: 0.5;
          }
          .nexus-embed[data-theme="light"] .nexus-embed-footer {
            border-color: #e5e7eb;
          }
          .nexus-embed[data-theme="dark"] .nexus-embed-footer {
            border-color: #374151;
          }
        `;
        document.head.appendChild(style);
      }
    }

    async fetchData() {
      if (this.isLoading) return;

      this.isLoading = true;
      this.renderLoading();

      try {
        const endpoint = this.embedId
          ? `${this.serverUrl}/api/embed/${this.embedId}/data`
          : `${this.serverUrl}/api/embed/bulk`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        this.data = await response.json();

        // Use refreshInterval from server if available
        if (this.data.settings && this.data.settings.refreshInterval) {
          this.refreshInterval = this.data.settings.refreshInterval;
        }

        this.render();
      } catch (error) {
        console.error("[Nexus Embed] Error fetching data:", error);
        this.renderError(error.message);
      } finally {
        this.isLoading = false;
      }
    }

    renderLoading() {
      this.element.innerHTML =
        '<div class="nexus-embed-loading">Loading...</div>';
    }

    renderError(message) {
      this.element.innerHTML = `
        <div class="nexus-embed-error">
          <strong>Error:</strong> ${this.escapeHtml(message)}
        </div>
      `;
    }

    render() {
      if (!this.data) {
        this.renderError("No data available");
        return;
      }

      const type = this.data.type;
      let content = "";

      switch (type) {
        case "status":
          content = this.renderStatus();
          break;
        case "uptime":
          content = this.renderUptime();
          break;
        case "metrics":
          content = this.renderMetrics();
          break;
        default:
          content = `<div>Unknown embed type: ${this.escapeHtml(type)}</div>`;
      }

      this.element.innerHTML = content + this.renderFooter();
    }

    renderStatus() {
      if (!this.data.services || this.data.services.length === 0) {
        return "<div>No services available</div>";
      }

      const servicesHtml = this.data.services
        .map(
          (service) => `
        <div class="nexus-service-card">
          <div class="nexus-service-icon">
            <img src="${this.serverUrl}/icons/${this.escapeHtml(service.icon)}" 
                 alt="${this.escapeHtml(service.name)}" 
                 style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div class="nexus-service-name">${this.escapeHtml(service.name)}</div>
          <span class="nexus-service-status nexus-status-${service.healthStatus}">
            ${this.escapeHtml(service.healthStatus)}
          </span>
        </div>
      `,
        )
        .join("");

      return `
        <div>
          <h3 style="margin: 0 0 12px 0;">Service Status</h3>
          <div class="nexus-status-grid">${servicesHtml}</div>
        </div>
      `;
    }

    renderUptime() {
      if (!this.data.uptime || this.data.uptime.length === 0) {
        return "<div>No uptime data available</div>";
      }

      const uptimeHtml = this.data.uptime
        .map((item) => {
          const percentage = item.uptime
            ? this.calculateUptimePercentage(item.uptime)
            : "N/A";
          return `
          <div class="nexus-uptime-item">
            <span>${this.escapeHtml(item.serviceName)}</span>
            <span class="nexus-uptime-percentage">${percentage}%</span>
          </div>
        `;
        })
        .join("");

      return `
        <div>
          <h3 style="margin: 0 0 12px 0;">Uptime (7 days)</h3>
          <div class="nexus-uptime-list">${uptimeHtml}</div>
        </div>
      `;
    }

    renderMetrics() {
      if (!this.data.metrics) {
        return "<div>No metrics available</div>";
      }

      const metrics = this.data.metrics;
      return `
        <div>
          <h3 style="margin: 0 0 12px 0;">System Metrics</h3>
          <div class="nexus-metrics-grid">
            <div class="nexus-metric">
              <div class="nexus-metric-value">${metrics.total}</div>
              <div class="nexus-metric-label">Total</div>
            </div>
            <div class="nexus-metric">
              <div class="nexus-metric-value" style="color: #10b981;">${metrics.healthy}</div>
              <div class="nexus-metric-label">Healthy</div>
            </div>
            <div class="nexus-metric">
              <div class="nexus-metric-value" style="color: #ef4444;">${metrics.unhealthy}</div>
              <div class="nexus-metric-label">Unhealthy</div>
            </div>
            <div class="nexus-metric">
              <div class="nexus-metric-value">${metrics.uptimePercentage}%</div>
              <div class="nexus-metric-label">Uptime</div>
            </div>
          </div>
        </div>
      `;
    }

    renderFooter() {
      return `
        <div class="nexus-embed-footer">
          Powered by Nexus • Updated ${new Date().toLocaleTimeString()}
        </div>
      `;
    }

    calculateUptimePercentage(uptimeData) {
      if (!uptimeData || uptimeData.length === 0) return 0;

      const total = uptimeData.length;
      const up = uptimeData.filter((d) => d.status === "up").length;
      return ((up / total) * 100).toFixed(2);
    }

    startAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }

      this.refreshTimer = setInterval(() => {
        this.fetchData();
      }, this.refreshInterval * 1000);
    }

    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    }

    destroy() {
      this.stopAutoRefresh();
      this.element.innerHTML = "";
      this.element.classList.remove("nexus-embed");
    }

    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Auto-initialize all embed widgets on page load
  function autoInit() {
    const elements = document.querySelectorAll("[data-api-key]");
    elements.forEach((element) => {
      if (!element._nexusEmbed) {
        element._nexusEmbed = new NexusEmbed(element);
      }
    });
  }

  // Expose to global scope
  window.NexusEmbed = NexusEmbed;

  // Auto-initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();
