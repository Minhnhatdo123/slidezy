class Slidezy{
    constructor(selector, options = {}) {
        this.container = document.querySelector(selector);
        if(!this.container) {
            console.error(`Element with selector "${selector}" not found.`);
            return;
        }

        this.options = Object.assign({
            slideDuration: 3000, // Thời gian hiển thị mỗi slide (ms)
            transitionDuration: 500, // Thời gian chuyển đổi giữa các slide (ms)
            autoplay: true, // Slide tự chạy hay không
            loop: true // Slide có lặp lại hay không
        }, options);

        this.index = 0;
        this.timer = null;

        this._createBuild();

        this.track = this.container.querySelector('.slidezy-track'); // Thẻ chứa các slide
        this.slides = this.container.querySelectorAll('.slidezy-slide');
            this.prevBtn = this.container.querySelector('.slidezy-prev');
        this.nextBtn = this.container.querySelector('.slidezy-next');
        this.dots = this.container.querySelectorAll('.slidezy-dot');
        
        if(this.options.loop){
            this._setupCloneSlides(); // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
        }

        this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
        
        this._init();
    }

    _createBuild() {
        // Thêm class cho container
        this.container.classList.add('slidezy');

        // Tạo wrapper chứa các slide
        const content = document.createElement('div');
        content.classList.add('slidezy-content');
        
        const track = document.createElement('div');
        track.classList.add('slidezy-track');

        const slides = Array.from(this.container.children);
        slides.forEach(slide => {
            slide.classList.add('slidezy-slide');
            track.appendChild(slide);
        })

        // Clear container và thêm lại nội dung đã được bọc trong track
        this.container.innerHTML = '';

        // Gắn lại structure mới vào container
        content.appendChild(track);
        this.container.appendChild(content);

        // Tạo nút điều khiển Prev / Next
        
        const prevBtn = document.createElement('button');
        prevBtn.classList.add('slidezy-prev');
        prevBtn.innerHTML = '&#10094;'; // Biểu tượng mũi tên trái

        const nextBtn = document.createElement('button');
        nextBtn.classList.add('slidezy-next');
        nextBtn.innerHTML = '&#10095;'; // Biểu tượng mũi tên phải

        content.appendChild(prevBtn);
        content.appendChild(nextBtn);

        // Tao dot navigation
        const dotsContainer = document.createElement('div');
        dotsContainer.classList.add('slidezy-nav');

        slides.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('slidezy-dot');
            if(index === 0) {
                dot.classList.add('active');
            }
            dotsContainer.appendChild(dot);
        })

        this.container.appendChild(dotsContainer);
    }

    // Khởi tạo
    _init() {
        this.bindEvents();
        this.update();
        if(this.options.autoplay) {
            this.startAutoplay();
        }
    }

    // Gắn (attach) sự kiện cho các nút điều khiển
    bindEvents() {
        this.prevBtn?.addEventListener('click', () => this.prevSlide())
        this.nextBtn?.addEventListener('click', () => this.nextSlide()) ;

        this.dots.forEach((dot,index) => {
            dot.addEventListener('click', () => {
                this.goToSlide(index + 1 );
                // +1 vì index 0 là bắt đầu
            })
        })

        if(this.options.loop){
            this.track.addEventListener('transitionend', () => {
                const totalSlides = this.slides.length;

                // Nếu đang ở clone cuối cùng (slide đầu tiên), chuyển về slide đầu tiên
                if(this.index === totalSlides - 1) {
                    this.track.style.transition = 'none';
                    this.index = 1; // Slide đầu tiên (sau khi đã thêm clone)
                    this.update();
                    setTimeout(() => {
                        this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                    });
                }

                // Nếu đang ở clone đầu tiên (slide cuối cùng), chuyển về slide cuối cùng
                if(this.index === 0) {
                    this.track.style.transition = 'none';
                    this.index = totalSlides - 2; // Slide cuối cùng (sau khi đã thêm clone)
                    this.update();
                    setTimeout(() => {
                        this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                    });
                }
            });
        }
    }

        // Cập nhật vị trí slider theo index hiện tại   
    update(){
        const width = this.container.offsetWidth;
        this.track.style.transform = `translateX(-${this.index * width}px)`;
        
        this.updateDots();
    }

    updateDots(){
        if(!this.dots.length ) return;
        this.dots.forEach(dot => dot.classList.remove('active'));
        let realIndex = this.index;
        if(this.options.loop) {
            realIndex = this.index - 1;
            if(realIndex < 0){
                realIndex = this.dots.length - 1; // Trường hợp đang ở clone đầu tiên
            }
            if(realIndex >= this.dots.length ){
                realIndex = 0; // Trường hợp đang ở clone cuối cùng
            }
        }
        this.dots[realIndex]?.classList.add('active');
    }

    // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
    _setupCloneSlides() {
        const firstSlide = this.slides[0];
        const lastSlide = this.slides[this.slides.length - 1];
        const firstClone = firstSlide.cloneNode(true);
        const lastClone = lastSlide.cloneNode(true);
        this.track.appendChild(firstClone);
        this.track.insertBefore(lastClone, this.slides[0]);
        
        // Cập nhật lại danh sách slide sau khi thêm clone
        this.slides = this.container.querySelectorAll('.slidezy-slide');
        
        this.index = 1; // Bắt đầu từ slide đầu tiên (sau khi đã thêm clone)
    }


    // Đi đến slide tiếp theo
    nextSlide() {
        this.index++;
        this.update();
    }

    // Đi đến slide trước đó
    prevSlide() {
        this.index--;
        this.update(); 
    }

    // Đi đến slide cụ thể
    goToSlide(index) {
        if(index >= 0 && index < this.slides.length) {
            this.index = index;
            this.update();
        }
    }

    // Tự động chạy slide
    startAutoplay() {
        if(this.options.autoplay) {
            this.timer = setInterval(() => this.nextSlide(), this.options.slideDuration);
        }
    }

    // Dừng tự động chạy slide
    stopAutoplay() {
        clearInterval(this.timer);
    }
        
}


const slidezy = new Slidezy('#mySlider', {
    slideDuration: 4000,
    transitionDuration: 600,
    autoplay: false,
    loop: true
});