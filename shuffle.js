const getPlaylists = (token) => {
	$.ajax({
		url: "https://api.spotify.com/v1/me",
		headers: {
			Authorization: "Bearer " + token,
		},
		success: function (response) {
			const id = response.id;
			const playlists = [];

			let offset = 0;
			while (true) {
				let temp = getBatch(token, id, offset);
				for (const list of temp) {
					playlists.push(list);
				}

				if (playlists.length === offset + 50) {
					offset += 50;
				} else {
					break;
				}
			}

			displayPlaylists(token, playlists, id);
		},
		error: function (jqXHR, textStatus, errorThrown) {
			window.location.replace("https://elijahcirioli.com/trueshuffle");
		},
	});
};

const getBatch = (token, id, displacement) => {
	let items;
	$.ajax({
		url: "https://api.spotify.com/v1/users/" + id + "/playlists",
		headers: {
			Authorization: "Bearer " + token,
		},
		data: {
			limit: 50,
			offset: displacement,
		},
		success: function (response) {
			items = response.items;
		},
		async: false,
	});
	return items;
};

const displayPlaylists = (token, playlists, id) => {
	//remove public playlists
	for (let i = 0; i < playlists.length; i++) {
		if (playlists[i].owner.id !== id) {
			playlists.splice(i, 1);
			i--;
		}
	}

	for (let i = 0; i < playlists.length; i++) {
		$("#playlist-wrap").append(createPlaylistElement(token, playlists[i], i % 2 === 0));
	}

	$("#playlist-wrap").css("display", "flex");
};

const createPlaylistElement = (token, playlist, even) => {
	const div = $(document.createElement("div"));
	div.addClass("playlist");
	if (even) {
		div.css("background-color", "#171717");
	}

	const img = $(document.createElement("img"));
	img.addClass("playlist-image");
	img.attr("alt", playlist.name);
	if (playlist.images.length > 0) {
		img.attr("src", playlist.images[0].url);
	}
	div.append(img);

	const title = $(document.createElement("p"));
	title.addClass("playlist-title");
	title.text(playlist.name);
	div.append(title);

	const numTracks = $(document.createElement("p"));
	numTracks.addClass("playlist-length");
	numTracks.text(playlist.tracks.total + " songs");
	div.append(numTracks);

	const desc = $(document.createElement("p"));
	desc.addClass("playlist-description");
	desc.text(playlist.description);
	div.append(desc);

	const progressBar = $(document.createElement("div"));
	progressBar.addClass("progress-bar");
	div.append(progressBar);

	let thread;
	div.mousedown(function () {
		thread = setInterval(fillProgressBar, 20, div, token, playlist, thread);
	});
	div.mouseup(function () {
		div.children(".progress-bar").css("width", 0);
		clearInterval(thread);
	});
	div.mouseleave(function () {
		div.children(".progress-bar").css("width", 0);
		clearInterval(thread);
	});
	div.bind("touchend", function () {
		div.children(".progress-bar").css("width", 0);
		clearInterval(thread);
	});
	div.bind("touchstart", function () {
		thread = setInterval(fillProgressBar, 20, div, token, playlist, thread);
	});

	return div;
};

const fillProgressBar = (div, token, playlist, thread) => {
	const bar = div.children(".progress-bar");
	const progress = parseInt(bar.css("width").split("px")[0]);

	if (progress <= parseInt(div.css("width").split("px")[0])) {
		bar.css("width", progress + 5 + "px");
	} else {
		clearInterval(thread);
		div.mouseup(function () {});
		div.mouseleave(function () {});
		div.mousedown(function () {});
		div.bind("touchend", function () {});
		div.bind("touchstart", function () {});
		shuffle(token, playlist);
	}
};

const shuffle = (token, playlist) => {
	//get list of URIs
	const id = playlist.id;
	const tracks = [];
	let offset = 0;
	while (true) {
		let temp = getTrackBatch(token, id, offset);
		for (const song of temp) {
			tracks.push({ uri: song.track.uri });
		}
		if (tracks.length === offset + 100) {
			offset += 100;
		} else {
			break;
		}
	}

	if (tracks.length === 0) {
		return;
	}

	//Fisher-Yates shuffle
	let i = tracks.length,
		k,
		temp;
	while (--i > 0) {
		k = Math.floor(Math.random() * (i + 1));
		temp = tracks[k];
		tracks[k] = tracks[i];
		tracks[i] = temp;
	}

	//remove all songs
	for (let i = 0; i < tracks.length; i += 100) {
		let end = 100 + i;
		if (end > tracks.length) {
			end = tracks.length;
		}
		const sublist = tracks.slice(i, end);
		$.ajax({
			method: "DELETE",
			url: "https://api.spotify.com/v1/playlists/" + id + "/tracks",
			headers: {
				Authorization: "Bearer " + token,
			},
			contentType: "application/json",
			data: JSON.stringify({
				tracks: sublist,
			}),
			success: function (response) {},
			async: false,
		});
	}

	//add back in new order
	for (let i = 0; i < tracks.length; i += 100) {
		let end = 100 + i;
		if (end > tracks.length) {
			end = tracks.length;
		}
		const sublist = [];
		for (let j = i; j < end; j++) {
			sublist.push(tracks[j].uri);
		}
		$.ajax({
			method: "POST",
			url: "https://api.spotify.com/v1/playlists/" + id + "/tracks",
			headers: {
				Authorization: "Bearer " + token,
			},
			contentType: "application/json",
			data: JSON.stringify({
				uris: sublist,
			}),
			success: function (response) {},
			async: false,
		});
	}
	$("#shield").css("display", "block");
	window.location.href = playlist.external_urls.spotify;
};

const getTrackBatch = (token, id, displacement) => {
	let items;
	$.ajax({
		url: "https://api.spotify.com/v1/playlists/" + id + "/tracks",
		headers: {
			Authorization: "Bearer " + token,
		},
		data: {
			limit: 100,
			offset: displacement,
		},
		success: function (response) {
			items = response.items;
		},
		async: false,
	});
	return items;
};

window.onload = () => {
	const url = window.location.href;
	if (url.includes("access_token")) {
		//authorized successfully
		const token = url.substring(url.indexOf("=") + 1, url.indexOf("&"));
		getPlaylists(token);
	} else {
		//showed sign in button
		$("#login-button").css("display", "block");
	}
};
