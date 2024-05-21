import { google } from 'googleapis';
import { YoutubeTranscript } from 'youtube-transcript';

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

exports.handler = async (event) => {
  const { headers } = event;
  if (!headers.authorization || headers.authorization !== process.env.AUTH_TOKEN) {
    return {
      headers: {
        'Content-Type': 'application/json'
      },
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }

  const videoId = event.queryStringParameters.videoId;
  const token = JSON.parse(process.env.OAUTH_TOKEN);

  oauth2Client.setCredentials(token);

  const fetchVideoDetails = async () => {
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    const response = await youtube.videos.list({
      part: 'snippet,contentDetails,statistics',
      id: videoId
    });

    if (response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    return response.data.items[0];
  };

  const fetchTranscript = async () => {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      return transcript.map((line) => ({
        ...line,
        offset: Math.floor(line.offset)
      }));
    } catch (error) {
      throw new Error('Failed to fetch transcript');
    }
  };

  try {
    const videoDetails = await fetchVideoDetails();
    const transcript = await fetchTranscript();

    const result = {
      id: videoDetails.id,
      url: `https://www.youtube.com/watch?v=${videoDetails.id}`,
      title: videoDetails.snippet.title,
      channelId: videoDetails.snippet.channelId,
      channelTitle: videoDetails.snippet.channelTitle,
      viewCount: videoDetails.statistics.viewCount,
      likeCount: videoDetails.statistics.likeCount,
      commentCount: videoDetails.statistics.commentCount,
      thumbnailUrl: videoDetails.snippet.thumbnails.maxres.url,
      dateCreated: videoDetails.snippet.publishedAt,
      duration: videoDetails.contentDetails.duration,
      transcript: transcript.map((line) => `${Math.floor(line.offset / 1000)} -> ${line.text}`).join('\n'),
    };

    return {
      headers: {
        'Content-Type': 'application/json'
      },
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      headers: {
        'Content-Type': 'application/json'
      },
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
