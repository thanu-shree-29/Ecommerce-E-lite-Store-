function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    window.location.href = "login.html";
  });
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
    if (data.message === "Login successful") {
      localStorage.setItem("user", email);
      window.location.href = "dashboard.html";
    }
  });
}

function goToOrders() {
  window.location.href = "orders.html";
}

  fetch("/api/cart/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, price })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.message);
  });

function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}