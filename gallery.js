// script.js

const images = [
    // Add the paths to your images here
    '/image/abt1.jpg', '/image/abt1.jpg', '/image/abt1.jpg',
    '/image/abt1.jpg', '/image/abt1.jpg', '/image/abt1.jpg',
    '/image/abt1.jpg', '/image/abt1.jpg', '/image/abt1.jpg',
    '/image/abt1.jpg', '/image/abt1.jpg', '/image/abt1.jpg'
];

const itemsPerPage = 9;
let currentPage = 1;
const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const pageInfo = document.getElementById('page-info');

function showPage(page) {
    gallery.innerHTML = '';
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageImages = images.slice(start, end);

    pageImages.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.onclick = () => showModal(src);
        gallery.appendChild(img);
    });

    pageInfo.textContent = `Page ${page} of ${Math.ceil(images.length / itemsPerPage)}`;
    prevButton.disabled = page === 1;
    nextButton.disabled = page === Math.ceil(images.length / itemsPerPage);
}

function showModal(src) {
    modal.style.display = 'block';
    modalImg.src = src;
}

document.querySelector('.close').onclick = () => {
    modal.style.display = 'none';
}

window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

prevButton.onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
    }
}

nextButton.onclick = () => {
    if (currentPage < Math.ceil(images.length / itemsPerPage)) {
        currentPage++;
        showPage(currentPage);
    }
}

showPage(currentPage);
