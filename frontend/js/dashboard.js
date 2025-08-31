document.addEventListener("DOMContentLoaded", async function () {
    // Modal functionality
    const registerLink = document.getElementById("register-link");
    const modal = document.getElementById("registerModal");
    const closeModalBtn = document.getElementById("closeModal");

    modal.style.display = "none";

    registerLink.addEventListener("click", function (e) {
        e.preventDefault();
        modal.style.display = "block";
    });

    closeModalBtn.addEventListener("click", function () {
        modal.style.display = "none";
    });

    window.addEventListener("click", function (e) {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });

    // Profile dropdown functionality
    const profileToggle = document.getElementById('profile-toggle');
    const dropdown = document.querySelector('.profile-dropdown');
    
    profileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.opacity = dropdown.style.opacity === '1' ? '0' : '1';
        dropdown.style.visibility = dropdown.style.visibility === 'visible' ? 'hidden' : 'visible';
        dropdown.style.transform = dropdown.style.transform === 'translateY(0px)' ? 'translateY(-10px)' : 'translateY(0)';
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-container')) {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
            dropdown.style.transform = 'translateY(-10px)';
        }
    });

    // Logout functionality
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // Blood Inventory Table
    const API_URL = "http://127.0.0.1:5000/api/inventory";
    const bloodTableBody = document.getElementById("bloodTable");
    async function fetchBloodInventory() {
        try {
            const response = await fetch(API_URL);
            const result = await response.json();
    
            if (!Array.isArray(result.data)) {
                throw new Error("Invalid API response");
            }
    
            bloodTableBody.innerHTML = "";
    
            result.data.forEach((blood, index) => {
                const LOW_THRESHOLD = 5;
                let statusClass = (blood.status.toLowerCase() === 'low' || parseInt(blood.available_units) < LOW_THRESHOLD) 
                    ? 'low-stock' 
                    : 'available';
                console.log(`Blood Type: ${blood.blood_type}, Units: ${blood.available_units}, Status: ${blood.status}, Assigned Class: ${statusClass}`);

                const row = document.createElement("tr");
                row.classList.add("data-row");
                row.innerHTML = `
                    <td>${blood.blood_type}</td>
                    <td>${blood.available_units}</td>
                    <td>${blood.last_updated}</td>
                    <td class="${statusClass}">${blood.status}</td>
                    <td>
                        <button class="expand-btn" data-target="details-${index}">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </td>
                `;
    
                const detailsRow = document.createElement("tr");
                detailsRow.classList.add("details-row", "hidden");
                detailsRow.innerHTML = `
                  <td colspan="5">
                    <div class="details-container">
                      <div class="detail-item">
                        <i class="fas fa-user"></i> <strong>Donor:</strong> ${blood.donor_name || "N/A"}
                      </div>
                      <div class="detail-item">
                        <i class="fas fa-hospital"></i> <strong>Hospital:</strong> ${blood.hospital_name || "N/A"}
                      </div>
                      <div class="detail-item">
                        <i class="fas fa-phone-alt"></i> <strong>Contact:</strong> ${blood.contact_number || "N/A"}
                      </div>
                    </div>
                  </td>
                `;
    
                bloodTableBody.appendChild(row);
                bloodTableBody.appendChild(detailsRow);
            });
    
            document.querySelectorAll(".expand-btn").forEach((button) => {
                button.addEventListener("click", function () {
                    const detailsRow = this.closest("tr").nextElementSibling;
                    detailsRow.classList.toggle("hidden");
                    this.classList.toggle("expanded");
                });
            });
        } catch (error) {
            console.error("Error fetching blood inventory:", error);
        }
    }

    // Booking System
    const registrationForm = document.getElementById('registrationForm');
    
    async function loadUserBookings() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    
        try {
            const response = await fetch('http://127.0.0.1:5000/my-bookings', {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load bookings');
            }
    
            const data = await response.json();
            
            if (data.success) {
                const bookingSection = document.getElementById('bookingSection');
                bookingSection.innerHTML = '';
                
                if (!data.bookings || data.bookings.length === 0) {
                    bookingSection.innerHTML = `
                        <div class="no-bookings">
                            <i class="fas fa-calendar-times"></i>
                            <p>You have no bookings yet</p>
                        </div>
                    `;
                    return;
                }
                
                data.bookings.forEach(booking => {
                    try {
                        addBookingCard(validateBooking(booking));
                    } catch (error) {
                        console.error('Invalid booking data:', booking, error);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load bookings:', error);
            showNotification(error.message || 'Failed to load bookings', 'error');
        }
    }
    
    function validateBooking(booking) {
        return {
            _id: booking._id || `temp-${Math.random().toString(36).substr(2, 9)}`,
            name: booking.name || 'Anonymous Donor',
            email: booking.email || 'Not provided',
            contact: booking.contact || 'Not provided',
            bloodType: booking.bloodType || 'Unknown',
            hospital: booking.hospital || 'Unknown Hospital',
            date: booking.date || 'Not scheduled',
            time: booking.time || '',
            status: booking.status || 'Pending'
        };
    }
    
    
    // Simple HTML escape function for security
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    async function handleCancelBooking(bookingId, bookingCard) {
        if (!bookingId) {
            showNotification('Invalid booking reference', 'error');
            return;
        }
    
        if (!confirm('Are you sure you want to cancel this booking?')) return;
    
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');
    
            const response = await fetch(`http://127.0.0.1:5000/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to cancel booking');
            }
    
            bookingCard.remove();
            showNotification('Booking cancelled successfully!');
        } catch (error) {
            console.error('Cancellation error:', error);
            showNotification(error.message || 'Failed to cancel booking', 'error');
        }
    }

    function addBookingCard(booking) {
        const bookingCard = document.createElement('div');
        bookingCard.classList.add('booking-card');
        bookingCard.dataset.bookingId = booking._id; 
        
        bookingCard.innerHTML = `
            <div class="booking-card-header">
                <span class="inline-flex items-center px-4 py-2 text-base font-semibold text-yellow-800 bg-yellow-200 rounded-full shadow-md">
                    <i class="fas fa-hourglass-half mr-2 text-yellow-600 text-lg"></i> ${booking.status || 'Pending'}
                </span>
            </div>
            <div class="booking-card-body">
                <h3 class="text-xl font-semibold text-gray-800">${booking.name}</h3>    
                <div class="space-y-2 text-gray-600">
                    <p><i class="fas fa-phone mr-2 text-green-500"></i> Contact: ${booking.contact}</p>
                    <p><i class="fas fa-envelope mr-2 text-blue-500"></i> Email: ${booking.email}</p>
                    <p><i class="fas fa-tint text-red-500"></i> Blood Type: ${booking.bloodType}</p>
                    <p><i class="fas fa-hospital mr-2 text-red-500"></i> Hospital: ${booking.hospital}</p>
                    <p><i class="fas fa-calendar-alt mr-2 text-purple-500"></i> Date: ${booking.date}</p>
                    <p><i class="fas fa-clock mr-2 text-indigo-500"></i> Time: ${booking.time}</p>
                </div>
            </div>
            <div class="booking-card-footer">
                <button class="cancel-btn">
                    <i class="fas fa-times-circle"></i> Cancel Booking
                </button>
            </div>
        `;
        console.log('Created card for booking:', booking._id, booking.name);

        const cancelBtn = bookingCard.querySelector('.cancel-btn');
        cancelBtn.addEventListener('click', async () => {
            const bookingId = booking._id;
            console.log('Attempting to cancel booking:', bookingId);

            if (!bookingId) {
                console.error('No booking ID found');
                alert('Error: Invalid booking reference');
                return;
            }

            if (!confirm('Are you sure you want to cancel this booking?')) return;

            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Not authenticated');

                const response = await fetch(`http://127.0.0.1:5000/bookings/${bookingId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to cancel booking');
                }

                bookingCard.remove();
                showNotification('Booking cancelled successfully!');
            } catch (error) {
                console.error('Cancellation error:', error);
                showNotification(error.message || 'Failed to cancel booking', 'error');
            }
        });

        document.getElementById('bookingSection').appendChild(bookingCard);
    }
    
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login to book', 'error');
            return;
        }
    
        const bookingData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            contact: document.getElementById('contact').value,
            bloodType: document.getElementById('blood-type').value,
            hospital: document.getElementById('hospital').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value
        };
    
        try {
            const response = await fetch('http://127.0.0.1:5000/bookings', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingData)
            });
    
            if (!response) {
                throw new Error('No response from server');
            }
    
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Booking failed');
            }
    
            registrationForm.reset();
            document.getElementById('registerModal').style.display = 'none';
            showNotification('Booking created successfully!');
            await loadUserBookings();
    
        } catch (error) {
            console.error('Booking error:', error);
            
            let errorMessage = error.message;
            if (error instanceof TypeError) {
                errorMessage = 'Network error - please check your connection';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Could not connect to the server';
            }
            
            showNotification(errorMessage, 'error');
        }
    }

    // ========== Request Modal Functionality ========== //
    const requestModal = document.getElementById("requestModal");
    const resultsModal = document.getElementById("resultsModal");
    const requestLink = document.getElementById("request-link");
    const requestForm = document.getElementById("requestForm");
    const resultsContent = document.getElementById("resultsContent");
    const confirmBtn = document.getElementById("confirmBtn");

    if (requestLink) {
        requestLink.addEventListener("click", function (e) {
            e.preventDefault();
            requestModal.style.display = "block";
        });
    }

    document.getElementById("closeRequestModal").addEventListener("click", function () {
        requestModal.style.display = "none";
    });

    document.getElementById("closeResultsModal").addEventListener("click", function () {
        resultsModal.style.display = "none";
    });

    window.addEventListener("click", function (e) {
        if (e.target === requestModal) requestModal.style.display = "none";
        if (e.target === resultsModal) resultsModal.style.display = "none";
    });

    requestForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const bloodType = document.getElementById("bloodType").value;
        const unitsNeeded = parseInt(document.getElementById("unitsNeeded").value);

        const submitBtn = this.querySelector("button[type='submit']");
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
        submitBtn.disabled = true;

        try {
            const result = await runKnapsackAlgorithm(bloodType, unitsNeeded);
            displayAllocationResults(result);

            requestModal.style.display = "none";
            resultsModal.style.display = "block";
        } catch (error) {
            console.error("Allocation error:", error);
            showNotification("Failed to allocate blood: " + error.message, "error");
        } finally {
            submitBtn.innerHTML = '<i class="fas fa-search"></i> Find Matching Blood';
            submitBtn.disabled = false;
            console.log("Blood Type:", document.getElementById("bloodType").value);
            console.log("Units Needed:", document.getElementById("unitsNeeded").value);
        }
    });

    confirmBtn.addEventListener("click", function () {
        showNotification("Blood allocation confirmed!");
        resultsModal.style.display = "none";
    });

    async function runKnapsackAlgorithm(bloodType, unitsNeeded) {
        const token = localStorage.getItem('token');
        const response = await fetch('http://127.0.0.1:5000/api/knapsack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bloodType, unitsNeeded, prioritizeExpiry: true })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Allocation failed");
        }

        return await response.json();
    }

    function displayAllocationResults(result) {
        let html = `
        <div class="result-summary">
            <p><strong>Requested:</strong> ${result.requestedUnits} units of ${result.bloodType}</p>
            <p><strong>Allocated:</strong> ${result.allocatedUnits} units</p>
        </div>
        <div class="allocation-table">
            <table>
                <thead>
                    <tr>
                        <th>Hospital</th>
                        <th>Blood Type</th>
                        <th>Units</th>
                        <th>Days Until Expiry</th>
                    </tr>
                </thead>
                <tbody>
        `;

        result.allocations.forEach(allocation => {
            const daysUntilExpiry = allocation.days_until_expiry || 'N/A';
            const expiryClass = daysUntilExpiry !== 'N/A' && daysUntilExpiry < 7 ? 'near-expiry' : '';
            html += `
                <tr>
                    <td><i class="fas fa-hospital"></i> ${allocation.hospital}</td>
                    <td>${allocation.bloodType}</td>
                    <td>${allocation.units}</td>
                    <td class="${expiryClass}">${daysUntilExpiry}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        </div>
        `;

        if (result.allocatedUnits < result.requestedUnits) {
            html += `
            <div class="alert">
                <i class="fas fa-exclamation-triangle"></i>
                Could only allocate ${result.allocatedUnits} of ${result.requestedUnits} requested units
            </div>
            `;
        }
        resultsContent.innerHTML = html;
    }

    // Initialize
    fetchBloodInventory();
    loadUserBookings();
    if (!registrationForm.dataset.listenerAdded) {
        registrationForm.addEventListener('submit', handleFormSubmit);
        registrationForm.dataset.listenerAdded = "true";
    }
    
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
});