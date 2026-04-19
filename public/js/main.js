// Load all products
async function loadProducts() {
    try {
        const res = await fetch("/api/products");
        const products = await res.json();

        const container = document.getElementById("products");
        container.innerHTML = "";

        products.forEach(p => {
            container.innerHTML += `
                <div class="card">
                    <img src="/uploads/${p.image}" alt="${p.name}" 
                         style="width:100%; height:150px; object-fit:cover; border-radius:8px;">

                    <h3>${p.name}</h3>
                    <p>₹${p.price}</p>
                    <p style="font-size:14px; color:gray;">
                        ${p.description || ""}
                    </p>

                    <button onclick="addToCart('${p.name}', ${p.price})">
                        Add to Cart
                    </button>
                </div>
            `;
        });

    } catch (err) {
        console.log("Error loading products:", err);
    }
}


// Add to cart
async function addToCart(name, price) {
    try {
        const res = await fetch("/api/add-to-cart", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, price })
        });

        const data = await res.json();
        alert(data.message || "Added to cart");

    } catch (err) {
        console.log("Error adding to cart:", err);
    }
}


// Auto load when page opens
window.onload = loadProducts;