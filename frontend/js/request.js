// Request Modal Functionality
document.addEventListener("DOMContentLoaded", function() {
    // Get modal elements
    const requestModal = document.getElementById("requestModal");
    const resultsModal = document.getElementById("resultsModal");
    const requestLink = document.getElementById("request-link");
    const closeRequestModal = document.getElementById("closeRequestModal");
    const closeResultsModal = document.getElementById("closeResultsModal");
    const requestForm = document.getElementById("requestForm");
    const confirmAllocation = document.getElementById("confirmAllocation");

    // Open request modal
    if (requestLink) {
        requestLink.addEventListener("click", function(e) {
            e.preventDefault();
            requestModal.style.display = "block";
        });
    }

    // Close modals
    if (closeRequestModal) {
        closeRequestModal.addEventListener("click", function() {
            requestModal.style.display = "none";
        });
    }

    if (closeResultsModal) {
        closeResultsModal.addEventListener("click", function() {
            resultsModal.style.display = "none";
        });
    }

    // Close when clicking outside
    window.addEventListener("click", function(e) {
        if (e.target === requestModal) {
            requestModal.style.display = "none";
        }
        if (e.target === resultsModal) {
            resultsModal.style.display = "none";
        }
    });

    // Form submission
    if (requestForm) {
        requestForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            
            // Collect form data
            const requestData = {
                hospital: document.getElementById("request-hospital").value,
                bloodType: document.getElementById("blood-type-needed").value,
                units: document.getElementById("units-needed").value,
                urgency: document.getElementById("urgency-level").value,
                condition: document.getElementById("patient-condition").value
            };

            try {
                // Here you would call your backend API with the knapsack algorithm
                // For now, we'll simulate a response
                const allocationResult = await simulateKnapsackAlgorithm(requestData);
                
                // Display results
                displayResults(allocationResult);
                
                // Close request modal
                requestModal.style.display = "none";
                
                // Open results modal
                resultsModal.style.display = "block";
            } catch (error) {
                console.error("Request Error:", error);
                alert("Failed to calculate allocation. Please try again.");
            }
        });
    }

    // Confirm allocation
    if (confirmAllocation) {
        confirmAllocation.addEventListener("click", function() {
            alert("Blood allocation confirmed and reserved!");
            resultsModal.style.display = "none";
        });
    }

    // Simulate knapsack algorithm (replace with actual API call)
    function simulateKnapsackAlgorithm(requestData) {
        return new Promise((resolve) => {
            // Simulate API delay
            setTimeout(() => {
                // Mock response - in a real app, this would come from your backend
                const mockResponse = {
                    success: true,
                    allocation: {
                        available: Math.min(requestData.units, 10), // Mock available units
                        fromInventory: [
                            { bloodType: requestData.bloodType, units: Math.min(requestData.units, 5), source: "Main Storage" },
                            { bloodType: "O+", units: Math.max(0, requestData.units - 5), source: "Emergency Reserve" }
                        ],
                        alternatives: requestData.bloodType !== "O-" ? [
                            { bloodType: "O-", units: 2, compatibility: "Universal donor" }
                        ] : []
                    },
                    estimatedDelivery: calculateDeliveryTime(requestData.urgency),
                    notes: "Some units may need to be transported from nearby facilities."
                };
                resolve(mockResponse);
            }, 1000);
        });
    }

    function calculateDeliveryTime(urgency) {
        const now = new Date();
        switch(urgency) {
            case "critical": 
                now.setMinutes(now.getMinutes() + 30);
                return `Within 30 minutes (by ${now.toLocaleTimeString()})`;
            case "high":
                now.setHours(now.getHours() + 6);
                return `Within 6 hours (by ${now.toLocaleTimeString()})`;
            case "medium":
                now.setHours(now.getHours() + 24);
                return `Within 24 hours (by ${now.toLocaleDateString()})`;
            default:
                now.setHours(now.getHours() + 48);
                return `Within 48 hours (by ${now.toLocaleDateString()})`;
        }
    }

    function displayResults(results) {
        const resultsContent = document.getElementById("resultsContent");
        
        let html = `
            <div class="result-summary">
                <h3>Request Summary</h3>
                <p><strong>Hospital:</strong> ${document.getElementById("request-hospital").value}</p>
                <p><strong>Blood Type:</strong> ${document.getElementById("blood-type-needed").value}</p>
                <p><strong>Units Requested:</strong> ${document.getElementById("units-needed").value}</p>
            </div>
            
            <div class="allocation-details">
                <h3>Optimal Allocation</h3>
                <p>We can provide <strong>${results.allocation.available} units</strong>:</p>
                <ul class="allocation-sources">
        `;
        
        results.allocation.fromInventory.forEach(source => {
            html += `
                <li>
                    <i class="fas fa-arrow-right"></i>
                    ${source.units} units of ${source.bloodType} from ${source.source}
                </li>
            `;
        });
        
        html += `</ul>`;
        
        if (results.allocation.alternatives.length > 0) {
            html += `
                <div class="alternatives">
                    <h4>Compatible Alternatives Available</h4>
                    <ul>
            `;
            results.allocation.alternatives.forEach(alt => {
                html += `
                    <li>
                        <i class="fas fa-exchange-alt"></i>
                        ${alt.units} units of ${alt.bloodType} (${alt.compatibility})
                    </li>
                `;
            });
            html += `</ul></div>`;
        }
        
        html += `
            <div class="delivery-info">
                <h4>Delivery Information</h4>
                <p><i class="fas fa-truck"></i> ${results.estimatedDelivery}</p>
                <p class="notes">${results.notes}</p>
            </div>
        `;
        
        resultsContent.innerHTML = html;
    }
});