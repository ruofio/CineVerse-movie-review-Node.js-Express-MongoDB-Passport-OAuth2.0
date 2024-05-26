const mysteryBox = document.getElementById("mystery-box");
const boxLid = document.getElementById("box-lid");

mysteryBox.addEventListener("click", function () {
    toggleBox();
    redirectToRandomPage();
});

function toggleBox() {
    if (boxLid.style.transform === "scaleY(0)") {
        // Open the box
        boxLid.style.transform = "scaleY(1)";
    } else {
        // Close the box
        boxLid.style.transform = "scaleY(0)";
    }
}

function redirectToRandomPage() {
    // Redirect to the /random route on the server
    window.location.href = "/random";
}