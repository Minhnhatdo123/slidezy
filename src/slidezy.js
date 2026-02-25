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
                loop: true, // Slide có lặp lại hay không
                items:1 // Số lượng slide hiển thị cùng lúc
            }, options);

            this.index = 0;
            this.timer = null; // Biến lưu trữ timer cho autoplay

            this._createBuild();

            this.track = this.container.querySelector('.slidezy-track'); // Thẻ chứa các slide
            this.slides = this.container.querySelectorAll('.slidezy-slide');
            this.prevBtn = this.container.querySelector('.slidezy-prev');
            this.nextBtn = this.container.querySelector('.slidezy-next');
            this.dots = this.container.querySelectorAll('.slidezy-dot');
            
            // Thiết lập các slide clone nếu loop được bật
            if(this.options.loop){
                this._setupCloneSlides(); // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
            }

            this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
            
            this._setSlidesStyle(); // Thiết lập style cho các slide dựa trên số lượng items
            this._init(); // Khởi tạo sự kiện và cập nhật slider
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

            // Xóa sạch container và thêm nội dung mới vào container
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

            const totalSlides = Math.max(slides.length - this.options.items + 1, 1); // Số lượng dot cần tạo

            for(let i = 0; i < totalSlides; i++) {
                const dot = document.createElement('span');
                dot.classList.add('slidezy-dot');
                if(i === 0) dot.classList.add('active');   
                dotsContainer.appendChild(dot);
            }
        
            this.container.appendChild(dotsContainer);
        }

        // Khởi tạo
        _init() {
            this.bindEvents();
            this.update();// Cập nhật vị trí slider theo index hiện tại
            if(this.options.autoplay) {
                this.startAutoplay();
            }

            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);    
                resizeTimeout = setTimeout(() => {
                    this.update();
                }, 100);
            });
        }

        // Gắn (attach) sự kiện cho các nút điều khiển
        bindEvents() {
            this.prevBtn?.addEventListener('click', () => this.prevSlide())
            this.nextBtn?.addEventListener('click', () => this.nextSlide()) ;

            this.dots.forEach((dot,index) => {
                dot.addEventListener('click', () => {
                    if(this.options.loop) {
                        this.goToSlide(index + this.options.items); // Điều chỉnh index để phù hợp với slide clone
                    } else {   
                        this.goToSlide(index);
                    }
                }
            )
            })

            if(this.options.loop){
                this.track.addEventListener('transitionend', () => {
                    const items = this.options.items;
                    const totalSlides = this.slides.length;

                    // Nếu đang ở clone cuối cùng (slide đầu tiên), chuyển về slide đầu tiên
                    if(this.index >= totalSlides - items) {
                        this.track.style.transition = 'none';
                        this.index = items; // Slide đầu tiên (sau khi đã thêm clone)
                        this.update();
                        setTimeout(() => {
                            this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                        });
                    }

                    // Nếu đang ở clone đầu tiên (slide cuối cùng), chuyển về slide cuối cùng
                    if(this.index < items) {
                        this.track.style.transition = 'none';
                        this.index = totalSlides - (items * 2); // Slide cuối cùng (sau khi đã thêm clone)
                        this.update();
                        setTimeout(() => {
                            this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                        });
                    }
                });
            }
        }

        _setSlidesStyle() {
            const percent = 100 / this.options.items;
            this.track.style.display = 'flex';

            this.slides.forEach(slide => {
                slide.style.flex = `0 0 ${percent}%`;
            })
        }    

            // Cập nhật vị trí slider theo index hiện tại   
        update(){
            const slideWidth = 100 / this.options.items;
            this.track.style.transform = 
            `translateX(-${this.index * slideWidth}%)`;
            
            this.updateDots();
        }

        updateDots(){
            if(!this.dots.length ) return;
            this.dots.forEach(dot => dot.classList.remove('active'));
            let realIndex = this.index;
            if(this.options.loop) {
                realIndex = this.index - this.options.items; // Điều chỉnh index để phù hợp với dot navigation
                if(realIndex < 0){
                    realIndex = this.dots.length - 1; // Trường hợp đang ở clone đầu tiên
                }
                if(realIndex >= this.dots.length ){
                    realIndex = 0; // Trường hợp đang ở clone cuối cùng
                }
            }
            if(realIndex >= this.dots.length) return;
            this.dots[realIndex]?.classList.add('active');
        }

        // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
        _setupCloneSlides() {
            const items = this.options.items;
            const slideArray = Array.from(this.slides);

            // Clone cuối đưa lên đầu
            for(let i = slideArray.length - items; i < slideArray.length; i++) {
                const clone = slideArray[i].cloneNode(true);
                this.track.insertBefore(clone, this.slides[0]);
            }

            
            // Clone đầu đưa xuống cuối
            for(let i = 0; i < items; i++) {
                const clone = slideArray[i].cloneNode(true);
                this.track.appendChild(clone);
            }

            // Cập nhật lại danh sách slide sau khi thêm clone
            this.slides = this.container.querySelectorAll('.slidezy-slide');
            
            this.index = items; // Bắt đầu từ slide đầu tiên (sau khi đã thêm clone)
        }


        // Đi đến slide tiếp theo
        nextSlide() {
            const maxIndex = this.slides.length - this.options.items;
            if(!this.options.loop && this.index >= maxIndex) return; 
            // Nếu không loop và đang ở slide cuối thì dừng lại
            this.index++;
            this.update();
        }

        // Đi đến slide trước đó
        prevSlide() {
            if(!this.options.loop && this.index <= 0) return; // Nếu đang ở slide đầu tiên và loop, không làm gì
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
        loop: true,
        items:3
    });