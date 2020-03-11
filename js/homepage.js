const cs = document.getElementById('latest-video');
cs.parentNode.removeChild(cs);

const pres = new BoxPresenter(cs);
document.body.appendChild(pres.container);

handleResize = () => {
    pres.resize();
    const halfWidth = Math.round((pres.container.offsetWidth / 2));
    pres.container.style.left = 'calc(50% - ' + halfWidth + 'px)';
};

handleResize();
window.addEventListener('resize', handleResize);

pres.animate();
