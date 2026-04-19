async function loadCart(){
    const res = await fetch("/api/cart");
    const cart = await res.json();

    let total = 0;
    const div = document.getElementById("cart");

    div.innerHTML="";

    cart.forEach(i=>{
        total += i.price*i.quantity;

        div.innerHTML += `
        <h3>${i.name}</h3>
        <p>₹${i.price}</p>
        <p>Qty: ${i.quantity}</p>
        <button onclick="removeItem('${i.name}')">Remove</button>
        <hr>`;
    });

    document.getElementById("total").innerText="Total ₹"+total;
}

async function removeItem(name){
    await fetch("/api/remove",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name})
    });
    loadCart();
}

async function checkout(){
    await fetch("/api/checkout",{method:"POST"});
    alert("Order placed");
    loadCart();
}

loadCart();