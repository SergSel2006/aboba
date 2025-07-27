// @ts-check

class abcMessage {
    id;
    author;
    content;
    sent;
    encKeyDigest;

    constructor() {
        if (this.constructor === abcMessage) throw new Error("Cannot instantiate Base Class");
    }
    serialise() {
        throw new Error("serialise not implemented")
    }
}
class abcEncMessage extends abcMessage {
    constructor() {
        super()
        if (this.constructor === abcEncMessage) throw new Error("Cannot instantiate Base Class");
    }
    decrypt() {
        throw new Error("decrypt not implemented")
    }
}

class abcUser {
    id;
    privateKey;
    publicKey;
    profile;


    constructor() {
        if (this.constructor === abcUser) throw new Error("Cannot instantiate Base Class");
    }
    serialise() {
        throw new Error("serialise not implemented")
    }
}

class abcProfile {
    nick;
    avatar;
    color;
    status;

    constructor() {
        if (this.constructor === abcProfile) throw new Error("Cannot instantiate Base Class");
    }
    serialise() {
        throw new Error("serialise not implemented")
    }
}

class abcChat {
    id;
    psk;
    messages;

    constructor() {
        if (this.constructor === abcMessage) throw new Error("Cannot instantiate Base Class");
    }
    serialise() {
        throw new Error("serialise not implemented")
    }
}
