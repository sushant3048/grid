// image files are server form /content route
// image paths are fetched form data-imagepaths.txt. Which is stored in /content
// paths in the text file are addressed relative to IDLE folder.
// Preceeding part for absoulute address is strored in global imageServer var.
// Root of image server is /content
//////////////// CONFIGS //////////////////////////
var env = 1
// {0:mac, 1: home/office, 100:prod }

var noImage = false;

// only place-holders
var limit = 0;
// limit = 10 ** 4;
// 0: no limit, n: slices the sample
// see appEntry() for implementation.

var server = window.location.hostname;
var port = 80;
var route = "/content";   // content server route

// ************** remove in production ****************
if (env == 0) {
    server = '192.168.29.254'
}

// Selects a random element from an array
Array.prototype.random = function () {
    return this[Math.floor((Math.random() * this.length))];
}

////////////////// BUFFERS ////////////////////
var g_jsonIndex = [] // all avilabel paths indexed
var g_mainPageBuffer = []; // main page items persist on main page render
var g_pageBuffer = []; // items in the current page for rotation in image view. this may be eliminated as g_pageBuffer = g_navObject[page] 
var g_pages = []; // unique page ids
var g_navPages = []; // side nav search results
var g_persons = [];
var g_navObject = {}  // nested ogject
var g_likes = null



////////////////// HIGH FREQ GLOBALS ////////////
var g_mainView = document.querySelector('.main-view');
var g_pageView = document.querySelector('.page-view');
var g_imageView = document.querySelector('.image-view');




g_imageServer = `http://${server}:${port}${route}/`;
// console.log(g_imageServer)
var g_mainCols = 4;
var g_pageCols = 3;
var g_imgZoomFactor = 1;

////////////////// STATES ///////////////////
var g_sideNavActive = false;
var g_currentPage = "";
var g_currentSl = 0;
var g_currentView = 'main'  // main, page, image


appEntry();


function appEntry() {
    // Fetch the text file containing image paths
    // g_imageServer points upto the /content 
    let dataFile = g_imageServer + 'data-imagepaths.txt'
    console.log(dataFile)
    fetch(dataFile)
        .then(response => response.text())
        .then(data => {
            imagePaths = data.split('\n').filter(path => path.trim() !== '');
            if (limit)
                imagePaths = imagePaths.slice(0, limit);
            console.log('sample-size:', imagePaths.length)
            g_jsonIndex = []
            imagePaths.forEach(function (item, sl) {
                t = item.split('\\')
                page = t[2]
                person = t[1]
                g_jsonIndex.push({
                    'imid': item,
                    'sl': sl,
                    'url': g_imageServer + item,
                    'page': page,
                    'person': person
                })

                g_navObject[page] = g_navObject[page] || [];
                g_navObject[page].push(item)


                g_pages.push(page);
            });

            // console.log(g_jsonIndex)
            // console.log(g_navObject)

            // g_pages = [...new Set(g_pages)];
            // g_persons = [...new Set(g_persons)];
            g_pages = Object.keys(g_navObject);
            // console.log(g_navObject)
            // console.log(g_pages)


            localStorage.removeItem('likes');
            let a = localStorage.getItem('likes');
            if (!a) {
                g_likes = {}
                for (page of g_pages) {
                    // A new arrwy filled with zeros with # of images + 1 (for page itself) elements.
                    g_likes[page] = new Array(g_navObject[page].length + 1).fill(0);
                }
                setLikes()
            }
            else {
                g_likes = JSON.parse(a)
            }
            // console.log(localStorage.getItem('likes'))

            buildMainPageBuffer()
            renderMainView()
        })
        .catch(error => console.error(error));

    ///////////// event listeners /////////////////////////////////
    let pageSearch = document.querySelector('#page-search');
    pageSearch.addEventListener('input', e => {
        let val = e.currentTarget.value;
        document.querySelector('.search-icon').innerHTML = "close"
        if (val.length = 0) {
            document.querySelector('.search-icon').innerHTML = "close"
        }
        createNavItems(val)
    })
    document.addEventListener('keydown', e => {
        // console.log(e.code)
        if (e.code == 'ArrowRight') {
            next()
        }
        else if (e.code == 'ArrowLeft') {
            prev()
        }
    })

    /////////////////////////////////////////////////////////////////////
    // sideToggle()
}


function buildMainPageBuffer() {
    // clearing current images while preserving the refrence.
    g_mainPageBuffer.length = 0
    for (var i = 0; i < 200; i++) {
        g_mainPageBuffer.push(g_jsonIndex.random())
    }
}

function renderMainView() {
    g_currentView = 'main';
    g_mainView.style.display = 'block';
    g_pageView.style.display = 'none';
    g_imageView.style.display = 'none';
    let row = document.querySelector('.main-view .image-row');
    row.replaceChildren();
    for (i = 0; i < g_mainCols; i++) {
        col = document.createElement('div');
        col.classList.add('col-' + g_mainCols);
        col.classList.add('col');
        row.appendChild(col);
    }

    let cols = document.querySelectorAll('.main-view .col');
    cols.forEach(function (c) {
        c.replaceChildren();
    });
    g_mainPageBuffer.forEach(function (item, i) {
        var img = createImage(item);
        img.classList.add('pointer');
        img.addEventListener('click', function (e) {
            renderPageView(e.currentTarget.getAttribute('page'));
        })
        // img.querySelector('img').src = item.url;
        a = i % g_mainCols;
        cols[a].appendChild(img);
    })

    // setTimeout(function () {
    //     let imgs = g_mainView.querySelectorAll('img');
    //     imgs.forEach((item, i) => {
    //         item.src = g_mainPageBuffer[i].url;
    //     })
    // },2000)
}


function renderPageView(page = g_currentPage) {
    g_currentPage = page;
    g_currentView = 'page';
    g_mainView.style.display = 'none';
    g_pageView.style.display = 'block';
    g_imageView.style.display = 'none';

    let row = g_pageView.querySelector('.page-view .image-row');
    row.replaceChildren();
    for (i = 0; i < g_pageCols; i++) {
        let col = document.createElement('div');
        col.classList.add('col-' + g_pageCols);
        col.classList.add('col');
        row.appendChild(col);
    }

    let cols = row.querySelectorAll('.col');
    g_pageBuffer = g_jsonIndex.filter(item => {
        return item.page == page;
    })
    let likes = g_likes[page];
    g_pageBuffer.forEach(function (item, i) {
        var img = createImage(item);
        img.classList.add('pointer');
        img.addEventListener('click', function (e) {
            g_currentSl = i
            console.log(i)
            renderImageView();
        })
        img.setAttribute('sl', i);
        // img.innerHTML += `<div class="image-like">
        //         <i class=" pointer material-icons" onclick="imageLike(this,-1,${i});">chevron_left</i>
        //         <span class="imgae-like-count">${likes[i + 1]}</span>
        //          <i class="pointer material-icons" onclick="imageLike(this,1,${i});">chevron_right</i>
        //     </div>`
        a = i % g_pageCols;
        cols[a].appendChild(img);
    })
    g_pageView.querySelector('.page-name').innerHTML = page;
    let likeCount = g_pageView.querySelector('.page-like-count');
    // console.log(g_likes[page],page,g_currentPage);

    likeCount.innerHTML = likes[0];
    if (likes > 0) {
    }
    else {
    }


    if (g_sideNavActive) {
        setTimeout(navSelect, 0);
    }
}

var scale = 1;
function renderImageView() {

    g_currentView = 'image';

    if (g_currentSl >= g_pageBuffer.length) g_currentSl = 0;
    if (g_currentSl < 0) g_currentSl = g_pageBuffer.length - 1;

    let sl = g_currentSl;

    g_mainView.style.display = 'none';
    g_pageView.style.display = 'none';
    g_imageView.style.display = 'block';

    let imageContainer = g_imageView.querySelector('.image-container');
    imageContainer.replaceChildren();
    let item = g_pageBuffer[sl];
    let page = item.page;
    let img = createImage(item);
    img.setAttribute('sl', sl)


    imageContainer.appendChild(img);
    // Image natural size, display size, position and scale.
    let nw, nh, w, h, posX, posY, scale = 1;

    // Anchor position
    let ax, ay;

    img.onload = function (e) {
        // get original size of the image.
        nw = img.naturalWidth;
        nh = img.naturalHeight;

        // get display size of the image
        w = img.offsetWidth;
        h = img.offsetHeight;

        // get initial position
        posX = img.offsetLeft;
        posY = img.offsetTop;

        ax = Math.floor(w / 2);
        ay = Math.floor(h / 2);

    }


    // get the container size and position.
    let cw = imageContainer.offsetWidth;
    let ch = imageContainer.offsetHeight;

    // img to pan on mouse drag.
    let dragStartX = 0;
    let dragStartY = 0;

    img.onmousedown = function (e) {
        dragStartX = e.clientX;
        dragStartY = e.clientY;
    }


    img.onmousemove = function (e) {

        // get cursor position relative to the image.
        let x = e.offsetX;
        let y = e.offsetY;

        // displayDebugBox(x, y);

        // Dragging and panning
        if (e.buttons == 1) {
            // console.log(event)
            let x = e.clientX;
            let y = e.clientY;

            let dx = x - dragStartX;
            let dy = y - dragStartY;
            console.log('drags:', dx, dy);

            // Reset for next event
            dragStartX = x;
            dragStartY = y;

            posX += Math.floor(dx);
            posY += Math.floor(dy);

            // Apply new position
            translate();
        }
    }

    img.onwheel = function (e) {
        e.preventDefault();

        scale += e.deltaY * -0.001;
        scale = Math.min(Math.max(0.5, scale), 10);


        // get cursor position relative to the image.
        let x = e.offsetX;
        let y = e.offsetY;

        // Get position of the image
        let ix = img.offsetLeft;
        let iy = img.offsetTop;

        // Get diaplay size of the image
        let w = img.offsetWidth;
        let h = img.offsetHeight;

        // covert this to fraction
        let fx = x / w;
        let fy = y / h;

        // if cursor is too close to the edge, set the anchor to the edge.
        let th = 0.1;
        if (fx < th) fx = 0;
        if (fx > 1 - th) fx = 1;
        if (fy < th) fy = 0;
        if (fy > 1 - th) fy = 1;


        // Apply scale
        img.style.width = `${nw * scale}px`
        img.style.height = `${nh * scale}px`

        // get new size
        w1 = img.offsetWidth;
        h1 = img.offsetHeight;

        // Calculate new position so that cursor remains at the same position.
        posX = ix - (w1 - w) * fx;
        posY = iy - (h1 - h) * fy;

        // Apply new position
        img.style.left = `${posX}px`;
        img.style.top = `${posY}px`;

        imgCenterCorrection();
    }



    // This method cnters the dimension which is smaller than the container.
    function imgCenterCorrection() {
        // get the image size
        let w = img.offsetWidth;
        let h = img.offsetHeight;

        // get the container size
        let cw = imageContainer.offsetWidth;
        let ch = imageContainer.offsetHeight;

        // check if width is smaller than the container
        if (w < cw) {
            posX = (cw - w) / 2;
        }

        // check if height is smaller than the container
        if (h < ch) {
            posY = (ch - h) / 2;
        }

        img.style.left = `${posX}px`;
        img.style.top = `${posY}px`;
    }



    function displayDebugBox(cX, cY) {

        // Display a small info box
        let imgInfoBox = imageContainer.querySelector('.imgInfoBox');
        if (!imgInfoBox) {
            imgInfoBox = document.createElement('div');
            imgInfoBox.classList.add('imgInfoBox');
            imageContainer.appendChild(imgInfoBox);
        }
        // Get diaplay size of the image
        let w = img.offsetWidth;
        let h = img.offsetHeight;

        scale = w / nw;

        // get image position relative to the container
        let ix = img.offsetLeft;
        let iy = img.offsetTop;

        // Update values of the imgInfoBox
        imgInfoBox.innerHTML = `${cX},${cY}<hr> orig:${nw}x${nh}<hr> disp:${w}x${h} <hr> scale:${scale} <hr>pos:${posX},${posY}`;
    }
}






function createImage(obj) {
    let img = document.createElement("img");
    img.src = obj.url;
    img.setAttribute('data-src', obj.url);
    if (noImage) {
        img.src = `../assets/placeholders/graph.jpg`;
    }

    img.setAttribute('person', obj.person)
    img.setAttribute('loading', 'lazy');
    img.setAttribute('page', obj.page);
    img.classList.add('img-item');

    return img;
}



function goBack() {
    if (g_currentView == 'image') {
        renderPageView()
    }
    else {
        renderMainView()
    }
}


function next() {
    if (g_currentView == 'page') {
        let pages = g_pages;
        if (g_navPages.length > 0) {
            pages = g_navPages;
        }
        let currentIndex = pages.indexOf(g_currentPage);
        let nextIndex = currentIndex + 1;
        let nextPage = pages[nextIndex];
        console.log(g_currentPage, currentIndex, nextIndex, nextPage)
        renderPageView(nextPage)
    }
    else if (g_currentView == 'image') {
        g_currentSl += 1;
        renderImageView()
    }
}

function prev() {
    if (g_currentView == 'page') {
        let pages = g_pages;
        if (g_navPages.length > 0) {
            pages = g_navPages;
        }
        let currentIndex = pages.indexOf(g_currentPage);
        let nextIndex = currentIndex - 1;
        let nextPage = pages[nextIndex];
        console.log(g_currentPage, currentIndex, nextIndex, nextPage)
        renderPageView(nextPage)
    }
    else if (g_currentView == 'image') {
        g_currentSl -= 1;
        renderImageView()
    }
}

function spin() {
    navReset()
    if (g_currentView == 'page') {
        renderPageView(g_pages.random())
    }
    else if (g_currentView == 'image') {
        let page = g_pages.random()
        g_currentPage = page
        g_pageBuffer = g_jsonIndex.filter(item => {
            return item.page == page
        })
        let sl = Math.floor(g_pageBuffer.length * Math.random())
        console.log(page, sl)
        g_currentSl = sl
        renderImageView()
    }

    // navReset(page);
}


function showCurrentPage() {
    closeImageView()
}


function sideOpen() {
    let side = document.querySelector('.side')
    let sideToggleControl = document.querySelector('.side-toggle')
    let adjusts = []
    adjusts.push(document.querySelector('.page'))
    adjusts.push(...document.querySelectorAll('.prev'))
    adjusts.forEach(item => {
        item.style.marginLeft = '225px';
    });
    sideToggleControl.classList.add('active')
    side.style.display = 'block'
    navReset()
}

function sideClose() {
    let side = document.querySelector('.side')
    let sideToggleControl = document.querySelector('.side-toggle')
    side.style.display = 'none'
    sideToggleControl.classList.remove('active')
    let adjusts = []
    adjusts.push(document.querySelector('.page'))
    adjusts.push(...document.querySelectorAll('.prev'))
    adjusts.forEach(item => {
        item.style.marginLeft = '0px';
    })
}


function sideToggle() {
    g_sideNavActive = !g_sideNavActive;
    if (g_sideNavActive) {
        sideOpen()
    }
    else {
        sideClose()
    }
}

function createNavItems(val = '') {
    g_navPages = g_pages.filter(item => {
        return item.includes(val)
    })
    let navItems = document.querySelector('.nav-items');
    navItems.innerHTML = "";
    g_navPages.forEach(function (item, i) {
        let navItem = document.createElement('div');
        navItem.classList.add('nav-item');
        navItem.innerHTML += `<p>${item}</p>`;
        // p.innerText += " [" + g_navObject[item].length + "]";
        if (g_likes[item][0])
            navItem.innerHTML += `<i class="material-icons fav">favorite</i>`
        else {
            navItem.innerHTML += `<i class="material-icons fav"></i>`
        }
        // navItem.setAttribute('page', item);
        navItem.classList.add('pointer')
        navItem.addEventListener('click', e => {
            renderPageView(item)
        })
        navItems.appendChild(navItem);
    })
}




function navSelect() {
    let navCont = document.querySelector('.nav-items')
    let page = g_currentPage;
    let selected = navCont.querySelector('.nav-select');
    if (selected) {
        selected.classList.remove('nav-select')
    }
    let sl = g_navPages.indexOf(page);
    console.log(sl)
    let navItem = navCont.querySelectorAll('.nav-item')[sl];
    navItem.classList.add('nav-select');
    navItem.scrollIntoView({ behavior: "smooth", block: "center" });
}

function navReset() {
    document.querySelector('#page-search').value = "";
    document.querySelector('.search-icon').innerHTML = 'search';
    createNavItems()
}

function zoom(value) {
    if (g_currentView == 'main') {
        if (value == 1) {
            if (g_mainCols < 7) {
                g_mainCols++;
            }
        }
        else {
            if (g_mainCols > 1) {
                g_mainCols--;
            }
        }
        renderMainView()
    }
    if (g_currentView == 'page') {
        if (value == 1) {
            if (g_pageCols < 7) {
                g_pageCols++;
            }
        }
        else {
            if (g_pageCols > 1) {
                g_pageCols--;
            }
        }
        renderPageView()
    }
    if (g_currentView == 'image') {
        if (value == 1) {
            g_imgZoomFactor -= 0.1;
        }
        else {
            g_imgZoomFactor += 0.1;
        }
        renderImageView()
    }
}


function pageLike(ele, val) {
    let page = g_currentPage;
    val = parseInt(val);

    let likes = g_likes[page][0];
    likes += val;
    g_likes[page][0] = likes;
    ele.parentElement.querySelector('.page-like-count').innerText = likes;
    setLikes()
}

function imageLike(favicon) {
    let page = g_currentPage
    let sl = g_currentSl
    let pos = g_likes[page].indexOf(sl);
    if (pos > 0) {
        g_likes[page].pop(pos)
        favicon.innerHTML = 'favorite_border'

    }
    else {
        g_likes[page].push(sl)
        favicon.innerHTML = 'favorite'

    }
    setLikes()
    console.log(g_likes[page])
}
function setLikes() {
    localStorage.setItem('likes', JSON.stringify(g_likes))
}






