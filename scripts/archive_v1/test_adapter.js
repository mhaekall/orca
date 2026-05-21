const item = {
  "anilistId": 180891,
  "cleanTitle": "Absolute Regression",
  "nativeTitle": "절대회귀",
  "coverImage": "https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx180891-Bq4zQn4R5O8s.jpg",
  "color": "#e48643",
  "bannerImage": null,
  "score": 0,
  "popularity": 2223,
  "episodes": 101,
  "latestEpisode": 101,
  "status": "RELEASING",
  "genres": ["Action", "Fantasy"]
};

  const episode = String(
    item.latestChapter || 
    item.latestEpisode || 
    item.episodeNumber || 
    item.number || 
    item.episode || 
    item.progress ||
    '1'
  );
  
console.log("Episode string is:", episode);
