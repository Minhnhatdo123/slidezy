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
                items:1, // Số lượng slide hiển thị cùng lúc
                step:null, // Số lượng slide di chuyển mỗi lần
                nav:true, // Hiển thị navigation (dot) hay không
            }, options);

            if(this.options.step === null) {
                this.options.step = this.options.items; // Mặc định di chuyển bằng số lượng items hiển thị
            }

            this.index = 0;
            this.timer = null; // Biến lưu trữ timer cho autoplay
            this.isAnimating = false; // Biến để kiểm tra xem slider đang trong quá trình chuyển đổi hay không
            this.handlerDots = []; // Biến lưu trữ handler cho sự kiện click trên dot navigation

            this._createBuild();
            this._cacheElements(); // Lưu trữ các phần tử cần thiết để dễ dàng truy cập sau này                
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
            this.container.replaceChildren(content);

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
            if(this.options.nav) {
                const dotsContainer = document.createElement('div');
                dotsContainer.classList.add('slidezy-nav');
    
                // Tính số lượng dot cần tạo dựa trên số lượng slide và số lượng items hiển thị cùng lúc
                const totalSlides = 
                Math.ceil((slides.length - this.options.items) / this.options.step) + 1; // Số lượng dot cần tạo
    
                for(let i = 0; i < totalSlides; i++) {
                    const dot = document.createElement('span');
                    dot.classList.add('slidezy-dot');
                    if(i === 0) dot.classList.add('active');   
                    dotsContainer.appendChild(dot);
                }
            
                this.container.appendChild(dotsContainer);
            }
        }

        _cacheElements() {
            this.track = this.container.querySelector('.slidezy-track'); // Thẻ chứa các slide
            this.slides = this.container.querySelectorAll('.slidezy-slide');
            // Đảm bảo số lượng items không vượt quá số lượng slide thực tế
            this.options.items = Math.min(this.options.items, this.slides.length); // Đảm bảo số lượng items không vượt quá số lượng slide thực tế
            this.prevBtn = this.container.querySelector('.slidezy-prev');
            this.nextBtn = this.container.querySelector('.slidezy-next');
            this.dots = this.container.querySelectorAll('.slidezy-dot');
        }

        // Khởi tạo
        _init() {
            if(this.options.loop) {
                this._setupCloneSlides(); // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
                this.index = this.options.items; // Bắt đầu từ slide đầu tiên (sau khi đã thêm clone)
            }

            this._setSlidesStyle(); // Thiết lập style cho các slide dựa trên số lượng items

            this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
            this.bindEvents();
            this.update();// Cập nhật vị trí slider theo index hiện tại
            
            if(this.options.autoplay) {
                this.startAutoplay();
            }

            // Thêm sự kiện resize để cập nhật lại slider khi kích thước cửa sổ thay đổi
            // Tránh tình gây lag trang slider bị lệch khi thay đổi kích 
            let resizeTimeout;
            this.resizeHandler = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this._setSlidesStyle(); // Cập nhật lại style cho các slide khi kích thước thay đổi
                    this.update();
                }, 100);
            }

            window.addEventListener('resize', this.resizeHandler);
        }

        // Gắn (attach) sự kiện cho các nút điều khiển
        bindEvents() {
            this.handlerPrev = () => this.prevSlide();
            this.handlerNext = () => this.nextSlide();

            this.prevBtn?.addEventListener('click', this.handlerPrev) ;
            this.nextBtn?.addEventListener('click', this.handlerNext) ;

            this.dots.forEach((dot,index) => {
                const handler = () => {
                    if(this.isAnimating) return; // Nếu đang trong quá trình chuyển đổi, không làm gì
                    const targetIndex = index * this.options.step; // Tính index mục tiêu dựa trên vị trí dot và số lượng step
                    if(this.options.loop) {
                        const cloneCount = Math.max(this.options.items, this.options.step); // Số lượng slide đã được clone ở đầu và cuối
                        this.goToSlide(targetIndex + cloneCount); // Điều chỉnh index để phù hợp với slide clone
                    } else {   
                        this.goToSlide(targetIndex);
                    }

                }
                this.handlerDots.push(handler);
                dot.addEventListener('click', handler);
            })


            this.transitionEndHandler = (e) => {
                if(e.propertyName !== 'transform') return; // Chỉ xử lý khi transition kết thúc trên transform
                this.isAnimating = false; // Đánh dấu quá trình chuyển đổi đã kết thúc
    
                if(!this.options.loop) return; // Nếu không loop, không cần xử lý gì thêm
                const cloneCount = Math.max(this.options.items, this.options.step); // Số lượng slide đã được clone ở đầu và cuối
                const totalSlides = this.slides.length;
    
                // Nếu đang ở clone cuối cùng (slide đầu tiên), chuyển về slide đầu tiên
                if(this.index >= totalSlides - cloneCount) {
                    this.track.style.transition = 'none';
                    this.index = cloneCount; // Slide đầu tiên (sau khi đã thêm clone)
                    this.update();
                    setTimeout(() => {
                        this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                    },0);
                }
    
                // Nếu đang ở clone đầu tiên (slide cuối cùng), chuyển về slide cuối cùng
                if(this.index < cloneCount) {
                    this.track.style.transition = 'none';
                    this.index = totalSlides - (cloneCount * 2); // Slide cuối cùng (sau khi đã thêm clone)
                    this.update();
                    setTimeout(() => {
                        this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                    },0);
                }

            }

            this.track.addEventListener('transitionend', this.transitionEndHandler);
        }

        // Thiết lập style cho các slide
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

            const cloneCount = Math.max(this.options.items, this.options.step); // Số lượng slide đã được clone ở đầu và cuối            
            let realIndex = this.index;

            if(this.options.loop) {
                realIndex = this.index - cloneCount
            }
                                
            const pageIndex = Math.min(Math.floor(realIndex/this.options.step),this.dots.length - 1) // Tính index của dot cần active dựa trên vị trí slide hiện tại và số lượng step   
            if(pageIndex >= 0 && pageIndex < this.dots.length) {
                this.dots[pageIndex].classList.add('active');
            }
        }

        // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
        _setupCloneSlides() {
            const cloneCount = Math.max(this.options.items, this.options.step); // Số lượng slide cần clone để đảm bảo hiệu ứng loop mượt mà
            const slideArray = Array.from(this.slides);

            const fragmentStart = document.createDocumentFragment();
            const fragmentEnd = document.createDocumentFragment();

            // Clone cuối đưa lên đầu
            for(let i = slideArray.length - cloneCount; i < slideArray.length; i++) {
                const clone = slideArray[i].cloneNode(true);
                fragmentStart.appendChild(clone);
            }

            
            // Clone đầu đưa xuống cuối
            for(let i = 0; i < cloneCount; i++) {
                const clone = slideArray[i].cloneNode(true);
                fragmentEnd.appendChild(clone);
            }

            this.track.insertBefore(fragmentStart, this.slides[0]);
            this.track.appendChild(fragmentEnd);

            // Cập nhật lại danh sách slide sau khi thêm clone
            this.slides = this.container.querySelectorAll('.slidezy-slide');
            
            this.index = cloneCount; // Bắt đầu từ slide đầu tiên (sau khi đã thêm clone)
        }


        // Đi đến slide tiếp theo
        nextSlide() {
            if(this.isAnimating) return; // Nếu đang trong quá trình chuyển đổi, không làm gì
            const maxIndex = this.slides.length - this.options.items;
            if(!this.options.loop && this.index >= maxIndex) return; 
            // Nếu không loop và đang ở slide cuối thì dừng lại
            this.isAnimating = true; // Đánh dấu đang trong quá trình chuyển đổi
            
            if(this.options.loop) {
                this.index += this.options.step;
            } else {
                this.index = Math.min(this.index + this.options.step, maxIndex); // Không vượt quá slide cuối cùng
            }
            this.update();
        }

        // Đi đến slide trước đó
        prevSlide() {
            if(this.isAnimating) return; // Nếu đang trong quá trình chuyển đổi, không làm gì
            if(!this.options.loop && this.index <= 0) return;   // Nếu không loop và đang ở slide đầu tiên thì dừng lại
            this.isAnimating = true; // Đánh dấu đang trong quá trình chuyển đổi
            if(this.options.loop) {
                this.index -= this.options.step;
            } else {
                this.index = Math.max(this.index - this.options.step, 0); // Không vượt quá slide đầu tiên
            }
            this.update(); 
        }

        // Đi đến slide cụ thể
        goToSlide(index) {
            if(this.isAnimating) return; // Nếu đang trong quá trình chuyển đổi, không làm gì
            this.isAnimating = true; // Đánh dấu đang trong quá trình chuyển đổi

            if(this.options.loop) {
                if(index >= 0 && index < this.slides.length) {
                    this.index = index;
                    this.update();
                }
            } else 
            {
                const maxIndex = this.slides.length - this.options.items;
                if(index >= 0 && index <= maxIndex) {
                    this.index = index;
                    this.update();
                }
            }
        }

        // Tự động chạy slide
        startAutoplay() {
            this.stopAutoplay(); // Đảm bảo không có timer nào đang chạy trước khi bắt đầu timer mới
            if(this.options.autoplay) {
                this.timer = setInterval(() => this.nextSlide(), this.options.slideDuration);
            }
        }

        // Dừng tự động chạy slide
        stopAutoplay() {
            clearInterval(this.timer);
            this.timer = null;
        }

        destroy() { 
            // Xóa tất cả các sự kiện đã gắn
            this.prevBtn?.removeEventListener('click', this.handlerPrev);
            this.nextBtn?.removeEventListener('click', this.handlerNext);
            this.dots.forEach((dot,index) => {
                dot.removeEventListener('click', this.handlerDots[index]);
            }) ;
            this.track.removeEventListener('transitionend', this.transitionEndHandler);
            window.removeEventListener('resize', this.resizeHandler);

            // Dừng autoplay nếu đang chạy
            this.stopAutoplay();
        }   
    }


    const slidezy = new Slidezy('#mySlider', {
        slideDuration: 4000,
        transitionDuration: 600,
        autoplay: false,
        loop: true,
        items:1,
        step:1,
        nav:true,
    });