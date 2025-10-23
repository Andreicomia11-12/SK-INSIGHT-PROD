/**
 * Opens a lightbox to display an image in a larger view.
 * @param {string} imageUrl - The URL of the image to display.
 */
window.openImageLightbox = function(imageUrl) {
  // Remove any existing lightbox to avoid duplicates
  const existingLightbox = document.querySelector(".image-lightbox");
  if (existingLightbox) {
    existingLightbox.remove();
  }

  // Create the lightbox container
  const lightbox = document.createElement("div");
  lightbox.className = "image-lightbox";
  lightbox.innerHTML = `
    <div class="lightbox-content">
      <img src="${imageUrl}" alt="Enlarged Image" class="lightbox-image" />
      <button class="lightbox-close" title="Close">&times;</button>
    </div>
  `;

  // Append the lightbox to the body
  document.body.appendChild(lightbox);

  // Close the lightbox when the close button is clicked
  const closeButton = lightbox.querySelector(".lightbox-close");
  closeButton.addEventListener("click", () => {
    document.body.removeChild(lightbox);
  });

  // Close the lightbox when clicking outside the image
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) {
      document.body.removeChild(lightbox);
    }
  });
};