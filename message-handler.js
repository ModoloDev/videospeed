export const showMessage = (message, time) => {
  // Update status to let user know options were saved.
  const status = document.getElementById("status");
  status.textContent = message;
  setTimeout(function () {
    status.textContent = "";
  }, time ? time : 3000);
}