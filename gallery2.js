const gallery = document.getElementById('gallery');
const galleryContainer = document.querySelector('.gallery-container');
const imagePopup = document.getElementById('imagePopup');
const popupImage = document.getElementById('popupImage');
const closeBtn = document.querySelector('.close');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const pageInfo = document.getElementById('page-info');

const imagesPerPage = 9;
let currentPage = 1;

const images = [
    // Array of image URLs
    './image/gallery/abt1.jpg', './image/gallery/abt2.jpg', './image/gallery/abt3.jpg',
    './image/gallery/abt4.avif', './image/gallery/abt5.jpg', './image/gallery/abt6.webp',
    './image/gallery/abt7.jpg', './image/gallery/abt8.avif', './image/gallery/abt9.avif',
    './image/gallery/abt10.jpg', './image/gallery/abt11.avif', './image/gallery/abt12.jpg',
    './image/gallery/abt13.jpg', './image/gallery/abt14.jpg', './image/gallery/abt15.jpg',
    './image/gallery/abt16.jpg', './image/gallery/abt17.jpg', './image/gallery/abt18.jpg',
    './image/gallery/abt19.jpg', './image/gallery/abt20.jpg', './image/gallery/abt21.jpg',
    './image/gallery/abt22.jpg',  './image/gallery/abt24.jpg'
];

const totalPages = Math.ceil(images.length / imagesPerPage);

function renderGallery(page) {
    gallery.innerHTML = '';
    const startIndex = (page - 1) * imagesPerPage;
    const endIndex = page * imagesPerPage;
    const currentImages = images.slice(startIndex, endIndex);

    currentImages.forEach(imgSrc => {
        const imgContainer = document.createElement('div');
        const img = document.createElement('img');
        img.src = imgSrc;
        //img.addEventListener('click', () => openImagePopup(imgSrc));
        imgContainer.appendChild(img);
        gallery.appendChild(imgContainer);
    });

    updatePagination(page);
}

function openImagePopup(src) {
    imagePopup.style.display = 'block';
    popupImage.src = src;
}

function closeImagePopup() {
    imagePopup.style.display = 'none';
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderGallery(currentPage);
        scrollToTopOfGallery();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderGallery(currentPage);
        scrollToTopOfGallery();
    }
}

function updatePagination(page) {
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
}

function scrollToTopOfGallery() {
    galleryContainer.scrollIntoView({ behavior: 'smooth' });
}

closeBtn.addEventListener('click', closeImagePopup);
nextBtn.addEventListener('click', nextPage);
prevBtn.addEventListener('click', prevPage);

// Auto-scroll to next page every 5 seconds


// Initial render
renderGallery(currentPage);
