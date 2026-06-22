let currentCarId = null;

// Load cars on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCars();
    // Load packages and offers with error handling
    setTimeout(() => {
        loadPackages();
        loadHolidayOffers();
    }, 100); // Small delay to let cars load first
});

// ============================================
// CAR FUNCTIONS
// ============================================

async function loadCars(filters = {}) {
    const grid = document.querySelector('.cars-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading">Loading cars...</div>';

    try {
        const cars = await getCars(filters);
        
        if (cars.length === 0) {
            grid.innerHTML = `
                <div style="text-align:center;padding:3rem;grid-column:1/-1;">
                    <p style="font-size:1.5rem;">🚗 No cars found</p>
                    <p style="color:#666;">Try adjusting your filters</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = cars.map(car => {
            // Generate star rating
            const rating = car.avg_rating || 0;
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5 ? 1 : 0;
            const emptyStars = 5 - fullStars - halfStar;
            
            let starsHTML = '';
            for (let i = 0; i < fullStars; i++) starsHTML += '⭐';
            if (halfStar) starsHTML += '⭐';
            for (let i = 0; i < emptyStars; i++) starsHTML += '☆';
            
            return `
                <div class="car-card">
                    <img src="${car.image_url || 'https://via.placeholder.com/400x200?text=Car'}" 
                         alt="${car.brand} ${car.model}"
                         onerror="this.src='https://via.placeholder.com/400x200?text=🚗'">
                    <div class="details">
                        <h3>${car.brand} ${car.model} (${car.year})</h3>
                        <div class="price">$${car.price_per_day}/day</div>
                        <div class="rating">
                            <span>${starsHTML}</span>
                            <span style="color: #FFD700; font-weight: bold;">${rating.toFixed(1)}</span>
                            <span style="color: #666; font-size: 0.8rem;">(${car.review_count || 0} reviews)</span>
                        </div>
                        <div class="specs">
                            <span>⛽ ${car.fuel_type}</span>
                            <span>⚙️ ${car.transmission}</span>
                            <span>👥 ${car.seats} seats</span>
                            <span>${car.is_available ? '✅ Available' : '❌ Booked'}</span>
                        </div>
                        <button onclick="openBookingModal(${car.id}, '${car.brand} ${car.model}', ${car.price_per_day})" 
                                ${!car.is_available ? 'disabled' : ''}>
                            ${car.is_available ? '🚗 Book Now' : 'Not Available'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        grid.innerHTML = `<p style="color:red;text-align:center;">❌ Error loading cars: ${error.message}</p>`;
    }
}

// ============================================
// BOOKING FUNCTIONS
// ============================================

// Open booking modal
function openBookingModal(carId, carName, pricePerDay) {
    const user = getCurrentUser();
    if (!user) {
        alert('Please login to book a car');
        document.getElementById('loginModal').style.display = 'flex';
        return;
    }

    currentCarId = carId;
    document.getElementById('bookingCarInfo').innerHTML = `
        <p><strong>${carName}</strong></p>
        <p>Price: <strong>$${pricePerDay}</strong> per day</p>
    `;
    document.getElementById('bookingModal').style.display = 'flex';
    
    // Reset form
    document.getElementById('bookingForm').reset();
    document.getElementById('bookingTotal').textContent = '';
}

// Handle booking form
document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.onsubmit = async (e) => {
            e.preventDefault();
            
            const pickup = document.getElementById('pickupDate').value;
            const dropoff = document.getElementById('dropoffDate').value;

            if (!pickup || !dropoff) {
                alert('Please select both dates');
                return;
            }

            if (new Date(pickup) >= new Date(dropoff)) {
                alert('Dropoff date must be after pickup date');
                return;
            }

            try {
                const booking = await createBooking(currentCarId, pickup, dropoff);
                alert(`✅ Booking successful! Total: $${booking.total_price}`);
                closeModal('bookingModal');
                loadCars(); // Refresh car list
            } catch (error) {
                alert('❌ ' + error.message);
            }
        };
    }

    // Calculate total when dates change
    const pickupDate = document.getElementById('pickupDate');
    const dropoffDate = document.getElementById('dropoffDate');
    
    if (pickupDate && dropoffDate) {
        pickupDate.onchange = calculateTotal;
        dropoffDate.onchange = calculateTotal;
    }
});

function calculateTotal() {
    const pickup = document.getElementById('pickupDate').value;
    const dropoff = document.getElementById('dropoffDate').value;
    const totalDiv = document.getElementById('bookingTotal');
    
    if (pickup && dropoff) {
        const days = Math.ceil((new Date(dropoff) - new Date(pickup)) / (1000 * 60 * 60 * 24));
        if (days > 0) {
            // Get price from the car info
            const priceMatch = document.getElementById('bookingCarInfo')?.textContent?.match(/\$(\d+)/);
            if (priceMatch) {
                const pricePerDay = parseFloat(priceMatch[1]);
                const total = days * pricePerDay;
                totalDiv.textContent = `💰 Total: $${total} for ${days} day${days > 1 ? 's' : ''}`;
            }
        } else {
            totalDiv.textContent = '⚠️ Dropoff must be after pickup';
        }
    }
}

// ============================================
// HOLIDAY OFFERS (with timeout)
// ============================================
async function loadHolidayOffers() {
    try {
        const container = document.getElementById('holidayOffers');
        if (!container) return;
        
        // Set a timeout for the API call
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 3000)
        );
        
        const offersPromise = getHolidayOffers();
        const offers = await Promise.race([offersPromise, timeoutPromise]);
        
        if (!offers || offers.length === 0) {
            container.innerHTML = '<p style="grid-column:1/-1;color:#fff;">No active offers at the moment. Check back soon! 🎁</p>';
            return;
        }
        
        container.innerHTML = offers.map(offer => `
            <div class="offer-card">
                <h3>🎁 ${offer.name}</h3>
                <p>${offer.description}</p>
                <div class="discount">${offer.discount_percentage}% OFF</div>
                <div class="code">Code: ${offer.code}</div>
                <small>Valid until ${offer.end_date}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading offers:', error);
        const container = document.getElementById('holidayOffers');
        if (container) {
            container.innerHTML = '<p style="grid-column:1/-1;color:#fff;">⚠️ Offers temporarily unavailable.</p>';
        }
    }
}

// ============================================
// CAR PACKAGES (with timeout)
// ============================================
async function loadPackages() {
    try {
        const container = document.getElementById('packagesGrid');
        if (!container) return;
        
        // Set a timeout for the API call
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 3000)
        );
        
        const packagesPromise = getPackages();
        const packages = await Promise.race([packagesPromise, timeoutPromise]);
        
        if (!packages || packages.length === 0) {
            container.innerHTML = '<div class="loading-text">No packages available.</div>';
            return;
        }
        
        container.innerHTML = packages.map(pkg => {
            const services = [];
            if (pkg.includes_gps) services.push('🗺️ GPS');
            if (pkg.includes_insurance) services.push('🛡️ Insurance');
            if (pkg.includes_child_seat) services.push('👶 Child Seat');
            
            return `
                <div class="package-card">
                    <span class="package-badge">⭐ Package</span>
                    <h3>${pkg.name}</h3>
                    <p>${pkg.description || ''}</p>
                    <div class="price">$${pkg.base_price}/day</div>
                    ${pkg.discount_percentage > 0 ? `<span class="discount-badge">${pkg.discount_percentage}% OFF</span>` : ''}
                    <div class="services">
                        ${services.length > 0 ? services.map(s => `<span>${s}</span>`).join('') : '<span>Standard Package</span>'}
                    </div>
                    <div class="car-info">🚗 ${pkg.brand} ${pkg.model}</div>
                    <button class="book-btn" onclick="bookPackage(${pkg.id})">Book Now</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading packages:', error);
        const container = document.getElementById('packagesGrid');
        if (container) {
            container.innerHTML = '<div class="loading-text">⚠️ Packages temporarily unavailable.</div>';
        }
    }
}

// ============================================
// BOOK PACKAGE
// ============================================
async function bookPackage(packageId) {
    const user = getCurrentUser();
    if (!user) {
        alert('Please login to book a package');
        document.getElementById('loginModal').style.display = 'flex';
        return;
    }
    
    try {
        const pkg = await getPackageById(packageId);
        const services = [];
        if (pkg.includes_gps) services.push('✅ GPS');
        if (pkg.includes_insurance) services.push('✅ Insurance');
        if (pkg.includes_child_seat) services.push('✅ Child Seat');
        
        alert(`📦 Package: ${pkg.name}\n🚗 ${pkg.brand} ${pkg.model}\n💰 $${pkg.base_price}/day\n\n📋 Includes:\n${services.join('\n')}\n\nPlease select dates to continue.`);
        // Redirect to booking page with package
        window.location.href = `/book-package?packageId=${packageId}`;
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}