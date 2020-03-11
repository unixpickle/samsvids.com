class VideoList {
    constructor() {
        this.loader = document.getElementById('videos-loader');
        this.error = document.getElementById('videos-error');
        this.list = document.getElementById('video-list');
    }

    loadList() {
        // https://stackoverflow.com/questions/18267426/html-auto-embedding-recent-uploaded-videos-from-a-youtube-channel/45342740#45342740
        const channelID = 'UCUGp2Pe4XIfvcNb2gMXQp3w';
        const feedURL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' +
            encodeURIComponent(channelID);
        const apiURL = 'https://api.rss2json.com/v1/api.json?rss_url=' +
            encodeURIComponent(feedURL);
        fetch(apiURL).then((response) => {
            return response.json();
        }).then((data) => {
            this._showList(data.items);
        }).catch((e) => {
            this._showError(e);
        });
    }

    _showError(e) {
        console.log(e);
        this.loader.style.display = 'none';
        this.list.style.display = 'none';
        this.error.style.display = 'block';
    }

    _showList(items) {
        this.loader.style.display = 'none';
        this.error.style.display = 'none';
        this.list.innerHTML = '';
        items.forEach((item) => this._addListItem(item));
        this.list.style.display = 'block';
    }

    _addListItem(item) {
        const element = document.createElement('li');
        element.className = 'video-item';

        const linkElement = document.createElement('a');
        linkElement.href = item.link;
        element.appendChild(linkElement);

        const thumbnail = document.createElement('img');
        thumbnail.className = 'thumbnail';
        thumbnail.width = 106;
        thumbnail.height = 80;
        thumbnail.src = item.thumbnail;
        linkElement.appendChild(thumbnail);

        const title = document.createElement('label');
        title.className = 'title';
        title.textContent = item.title;
        linkElement.appendChild(title);

        const date = document.createElement('label');
        date.className = 'date';
        const jsDate = new Date(Date.parse(item.pubDate.replace(' ', 'T').replace('/', '-') + 'Z'));
        const months = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ]
        date.textContent = months[jsDate.getMonth()] + ' ' +
            jsDate.getDate() + ', ' + jsDate.getFullYear();
        linkElement.appendChild(date);

        this.list.appendChild(element);
    }
}

new VideoList().loadList();