const showMessage = (message, color = "green" ) => {
  // Update status to let user know options were saved.
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.color = color;
  setTimeout(function () {
    status.textContent = "";
  }, 3000);
}

const showError = (message) => {
 showMessage(message, "red");
}

export {showError, showMessage}