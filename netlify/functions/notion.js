const { markdownToBlocks } = require('@tryfabric/martian');
const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');

exports.handler = async function(event, context) {
    const { httpMethod, headers, body } = event;
    if (!headers.authorization || headers.authorization !== process.env.AUTH_TOKEN) {
        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 401,
            body: JSON.stringify({ message: "Unauthorized" }),
        };
    }

    const notionToken = headers['notiontoken'] || headers['NotionToken'];
    if (!notionToken) {
        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 400,
            body: JSON.stringify({ message: 'NotionToken header is required.' })
        };
    }
    const notionClient = new Client({ auth: notionToken });
    const n2m = new NotionToMarkdown({ notionClient });
    if (httpMethod !== 'POST') {
        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' })
        };
    }
    try {
        const { action, ...payload } = JSON.parse(body);

        if (action === 'markdown-to-notion') {
            const blocks = markdownToBlocks(payload.markdown);
            return {
                headers: {
                    'Content-Type': 'application/json'
                },
                statusCode: 200,
                body: JSON.stringify(blocks)
            };
        } else if (action === 'notion-to-markdown') {
            const mdblocks = await n2m.pageToMarkdown(payload.pageId);
            const mdString = n2m.toMarkdownString(mdblocks);
            return {
                headers: {
                    'Content-Type': 'application/json'
                },
                statusCode: 200,
                body: JSON.stringify({ markdown: mdString.parent })
            };
        } else {
            return {
                headers: {
                    'Content-Type': 'application/json'
                },
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid action.' })
            };
        }
    } catch (error) {
        return {
            headers: {
                'Content-Type': 'application/json'
            },
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};