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
                control: true, // Hiển thị nút điều khiển Prev/Next hay không
                controlText : ["<" , ">"],
                prevButton : null,
                nextButton : null  
            }, options);                                                    

            this.options.step ??= this.options.items; // Nếu step không được cung cấp, mặc định bằng số lượng items
            if(this.options.step <= 0)
            {
                console.warn('Step must be greater than 0. Defaulting to 1.');
                this.options.step = 1;
            }

            this.index = 0;
            this.timer = null; // Biến lưu trữ timer cho autoplay
            this.isAnimating = false; // Biến để kiểm tra xem slider đang trong quá trình chuyển đổi hay không
            this.destroyed = false; 
            this.handlerDots = []; // Biến lưu trữ handler cho sự kiện click trên dot navigation
            this.originalChildren = Array.from(this.container.children);


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

            const slides = this.originalChildren;
            if(slides.length === 0) {
                console.error('No slides found in the container.');
                return;
            }

            slides.forEach(slide => {
                slide.classList.add('slidezy-slide');
                track.appendChild(slide);
            })

            // Xóa sạch container và thêm nội dung mới vào container
            this.container.replaceChildren(content);

            // Gắn lại structure mới vào container
            content.appendChild(track);

            // Tạo nút điều khiển Prev / Next
            if(this.options.control) {
                const prevBtn = document.createElement('button');
                prevBtn.classList.add('slidezy-prev');
                prevBtn.innerHTML = 
                this.options.controlText?.[0] || '&#10094;'; // Biểu tượng mũi tên trái
    
                const nextBtn = document.createElement('button');
                nextBtn.classList.add('slidezy-next');
                nextBtn.innerHTML = 
                this.options.controlText?.[1] || '&#10095;'; // Biểu tượng mũi tên phải
    
                content.appendChild(prevBtn);
                content.appendChild(nextBtn);
            }

            // Tao dot navigation
            if(this.options.nav) {
                const dotsContainer = document.createElement('div');
                dotsContainer.classList.add('slidezy-nav');
    
                const totalDots = this._calculateDots(slides.length)
    
                for(let i = 0; i < totalDots; i++) {
                    const dot = document.createElement('span');
                    dot.classList.add('slidezy-dot');
                    if(i === 0) dot.classList.add('active');   
                    dotsContainer.appendChild(dot);
                }
            
                this.container.appendChild(dotsContainer);
            }
        }

        _calculateDots(slideCount)
        {
            // Tính số lượng dot cần tạo dựa trên số lượng slide và số lượng items hiển thị cùng lúc
                if(this.options.loop)
                {
                    return Math.ceil(slideCount / this.options.step);
                } 

                if(slideCount <= this.options.items) return 1;

                return Math.ceil((slideCount - this.options.items) / this.options.step) + 1
        }

        // Lưu lại DOM element để tái sử dụng
        _cacheElements() {
            this.track = this.container.querySelector('.slidezy-track'); // Thẻ chứa các slide
            this.slides = this.track.querySelectorAll('.slidezy-slide');
            this.realSlidesCount = this.slides.length; // Số lượng slide thực tế (không tính slide clone)

            // Đảm bảo số lượng items không vượt quá số lượng slide thực tế
            this.options.items = Math.min(this.options.items, this.realSlidesCount); // Đảm bảo số lượng items không vượt quá số lượng slide thực tế
            
            // Đảm số step không vượt quá số lượng slide thực tế
            this.options.step = Math.min(this.options.step , this.realSlidesCount)

            this.prevBtn = (this.options.prevButton && document.querySelector(this.options.prevButton)) 
                            || this.container.querySelector('.slidezy-prev');

            this.nextBtn = (this.options.nextButton && document.querySelector(this.options.nextButton)) 
                            ||  this.container.querySelector('.slidezy-next');
            this.dots = this.container.querySelectorAll('.slidezy-dot');
        }


        // Khởi tạo
        _init() {
            if(this.options.loop) {
                this._setupCloneSlides(); // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
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
                    
                    this.index = this._clampIndex(this.index);  
                    this.update();
                }, 100);
            }

            window.addEventListener('resize', this.resizeHandler);
        }

        // CloneCount >= items 
        // CloneCount >= step
        // CloneCount <= realSlidesCount
        _getCloneCount() {
            return Math.min(Math.max(this.options.items, this.options.step), 
            this.realSlidesCount); // Số lượng slide đã được clone ở đầu và cuối, đảm bảo không vượt quá số lượng slide thực tế
        }
        
        // giữ Index nằm trong khoảng lệ
        _clampIndex(index)
        {
            if(this.options.loop) return index;
            const maxIndex = Math.max(0,this.realSlidesCount - this.options.items);
            return Math.max(0,Math.min(index,maxIndex));
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
                        // CloneCount là số lượng slide đã được clone ở đầu và cuối, cần cộng thêm để điều chỉnh index cho phù hợp với slide clone
                        const cloneCount = this._getCloneCount(); // Tránh bug khi step > items
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
                const cloneCount = this._getCloneCount(); // Số lượng slide đã được clone ở đầu và cuối
                const totalSlides = this.slides.length;
    
                // Nếu đang ở clone cuối cùng (slide đầu tiên), chuyển về slide đầu tiên
                if(this.index >= totalSlides - cloneCount) {
                    this.track.style.transition = 'none';
                    this.index = cloneCount; // Slide thật đầu tiên (sau khi đã thêm clone)
                    this.update();
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                        });
                    });
                    return;
                }
    
                // Nếu đang ở clone đầu tiên (slide cuối cùng), chuyển về slide cuối cùng
                if(this.index < cloneCount) {
                    this.track.style.transition = 'none';
                    this.index = totalSlides - (cloneCount * 2); // Slide cuối cùng (sau khi đã thêm clone)
                    this.update();
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            this.track.style.transition = `transform ${this.options.transitionDuration}ms ease`;
                        });
                    });
                    return;
                }

            }

            this.track.addEventListener('transitionend', this.transitionEndHandler);
        }

        // Thiết lập style cho các slide
        _setSlidesStyle() {
            const percent = 100 / this.options.items;
            this.track.style.display = 'flex';

            if(!this.slides.length) return;
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

            if(this.options.transitionDuration === 0)
            {
                this.isAnimating = false; // Nếu không có hiệu ứng chuyển đổi, đánh dấu quá trình chuyển đổi đã kết thúc ngay lập tức
            }
        }

        updateDots(){
            if(!this.dots.length ) return;
            this.dots.forEach(dot => dot.classList.remove('active'));

            let realIndex = this.index; 
            if(this.options.loop) {
                const cloneCount = this._getCloneCount() // Số lượng slide đã được clone ở đầu và cuối            
                realIndex = (this.index - cloneCount + this.realSlidesCount) % this.realSlidesCount
            }
              
            // Tính index của dot cần active dựa trên vị trí slide hiện tại và số lượng step   
            const pageIndex = Math.max(0 , Math.min(
                Math.floor(realIndex/this.options.step),
                this.dots.length - 1) ) 

            if(pageIndex >= 0 && pageIndex < this.dots.length) {
                this.dots[pageIndex].classList.add('active');
            }
        }

        // Thiết lập các slide clone để tạo hiệu ứng loop mượt mà
        _setupCloneSlides() {
            const cloneCount = this._getCloneCount() // Số lượng slide cần clone để đảm bảo hiệu ứng loop mượt mà
            const slideArray = Array.from(this.slides);

            const fragmentStart = document.createDocumentFragment();
            const fragmentEnd = document.createDocumentFragment();

            // Clone cuối đưa lên đầu
            const start = Math.max(0,this.slides.length - cloneCount); // Đảm bảo không vượt quá số lượng slide thực tế
            for(let i = start; i < slideArray.length; i++) {
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
            this.slides = this.track.querySelectorAll('.slidezy-slide');
            
            this.index = cloneCount; // Bắt đầu từ slide đầu tiên (sau khi đã thêm clone)
        }

        // Xử lý tương tác của người dùng 
        // Khi người dùng tương tác autoplaySlides(tự động chạy Slides)
        // Nó sẽ dừng lại và chạy lại sau khi người dùng tương tác 
        // Tránh tình trạng nhảy double slides khi người dùng click liên tục vào nút điều khiển hoặc dot navigation 
        _handlerUserInteraction() {
            if(this.options.autoplay) {
                this.stopAutoplay(); // Dừng autoplay khi người dùng tương tác
                this.startAutoplay(); // Khởi động lại autoplay sau khi người dùng tương tác
            }
        }

        // Đi đến slide tiếp theo
        nextSlide() {
            if(this.isAnimating) return; // Nếu đang trong quá trình chuyển đổi, không làm gì
            this._handlerUserInteraction(); // Xử lý tương tác của người dùng để dừng và khởi động lại autoplay nếu cần
            
            if(this.options.loop)
            {
                this.isAnimating = true; // Đánh dấu đang trong quá trình chuyển đổi
                this.index += this.options.step;
                this.update();
                return;
            }

            const maxIndex = Math.max(0,this.realSlidesCount - this.options.items);
            if(this.index >= maxIndex) return;
            this.isAnimating = true;
            this.index = Math.min(this.index + this.options.step, maxIndex);
            this.update();
        }

        // Đi đến slide trước đó
        prevSlide() {
            if(this.isAnimating) return; // Nếu đang trong quá trình chuyển đổi, không làm gì        
            this._handlerUserInteraction(); // Xử lý tương tác của người dùng để dừng và khởi động lại autoplay nếu cần

            if(this.options.loop)
            {
                this.isAnimating = true; // Đánh dấu đang trong quá trình chuyển đổi
                this.index -= this.options.step;
                this.update();
                return;
            }

            if(this.index <= 0) return;
            this.isAnimating = true;
            this.index = Math.max(this.index - this.options.step , 0)
            this.update(); 
        }


        // Đi đến slide cụ thể
        goToSlide(index) {
            if(this.isAnimating) return; // Nếu đang trong quá trình chuyển đổi, không làm gì
            this.isAnimating = true; // Đánh dấu đang trong quá trình chuyển đổi
            
            this.index = this._clampIndex(index);
            this.update();
            if(this.options.transitionDuration === 0)
            {
                this.isAnimating = false;
            }
        }

        // Tự động chạy slide
        startAutoplay() {
            this.stopAutoplay(); // Đảm bảo không có timer nào đang chạy trước khi bắt đầu timer mới
            if(this.options.autoplay) {
                this.timer = setInterval(() => {
                    if(!this.isAnimating) this.nextSlide();
                }
                , this.options.slideDuration);
            }
        }

        // Dừng tự động chạy slide
        stopAutoplay() {
            clearInterval(this.timer);
            this.timer = null;
        }

        destroy() { 
            if(this.destroyed) return;
            this.destroyed = true;

            // Xóa tất cả các sự kiện đã gắn
            this.prevBtn?.removeEventListener('click', this.handlerPrev);
            this.nextBtn?.removeEventListener('click', this.handlerNext);
            this.dots.forEach((dot,index) => {
                dot.removeEventListener('click', this.handlerDots[index]);
            }) ;
            this.track?.removeEventListener('transitionend', this.transitionEndHandler);
            window.removeEventListener('resize', this.resizeHandler);

            // Dừng autoplay nếu đang chạy
            this.stopAutoplay();

            // Clean class slidezy-slide khỏi các slide gốc
            this.originalChildren.forEach(slide => {
                slide.classList.remove("slidezy-slide");
                slide.style.flex = '' ;
            })

            this.container.replaceChildren(...this.originalChildren);

            // Clean trên container
            this.container.classList.remove('slidezy')
        }   
    }


    const slidezy = new Slidezy('#mySlider', {
        slideDuration: 4000,
        transitionDuration: 600,
        autoplay: false,
        loop: true,
        items:3,
        step:3,
        nav:true,
        control:false,
        controlText : ["<" , ">"],
        prevButton : ".slide-prev",
        nextButton : ".slide-next"
    });