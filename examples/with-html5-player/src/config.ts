const config = {
    userCredentials: {
        email: String(process.env.XBL_EMAIL || ''),
        password: String(process.env.XBL_PASSWORD || '')
    },
    demoGameclipParameters: {
        type: 'gameclips',
        xuid: '2535465515082324',
        scid: 'd1adc8aa-0a31-4407-90f2-7e9b54b0347c',
        id: '388f97c0-17bc-4939-a592-d43c365acc48'
    }
};

export = config;
