let currentCarId = null;

// Load cars on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCars();
});

async function loadCars(filters = {}) {
    const grid = document.querySelector('.cars-grid');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading">Loading cars</div>';

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

        grid.innerHTML = cars.map(car => `
            <div class="car-card">
                <img src="${car.image_url || 'https://via.placeholder.com/400x200?text=Car'}" 
                     alt="${car.brand} ${car.model}"
                     onerror="this.src='https://via.placeholder.com/400x200?text=🚗'">
                <div class="details">
                    <h3>${car.brand} ${car.model} (${car.year})</h3>
                    <div class="price">$${car.price_per_day}/day</div>
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
        `).join('');
    } catch (error) {
        grid.innerHTML = `<p style="color:red;text-align:center;">❌ Error loading cars: ${error.message}</p>`;
    }
}

// Search function
function searchCars() {
    const query = document.getElementById('searchInput').value;
    applyFilters();
}

// Apply all filters
function applyFilters() {
    const brand = document.getElementById('searchInput').value;
    const fuel = document.getElementById('fuelFilter').value;
    const transmission = document.getElementById('transmissionFilter').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;

    const filters = {};
    if (brand) filters.brand = brand;
    if (fuel) filters.fuel_type = fuel;
    if (transmission) filters.transmission = transmission;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;

    loadCars(filters);
}

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