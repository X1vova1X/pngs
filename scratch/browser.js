(async function(Scratch) {
    const variables = {};
    const blocks = [];
    const menus = {};


    if (!Scratch.extensions.unsandboxed) {
        alert("This extension needs to be unsandboxed to run!")
        return
    }

    function doSound(ab, cd, runtime) {
        const audioEngine = runtime.audioEngine;

        const fetchAsArrayBufferWithTimeout = (url) =>
            new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                let timeout = setTimeout(() => {
                    xhr.abort();
                    reject(new Error("Timed out"));
                }, 5000);
                xhr.onload = () => {
                    clearTimeout(timeout);
                    if (xhr.status === 200) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error(`HTTP error ${xhr.status} while fetching ${url}`));
                    }
                };
                xhr.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error(`Failed to request ${url}`));
                };
                xhr.responseType = "arraybuffer";
                xhr.open("GET", url);
                xhr.send();
            });

        const soundPlayerCache = new Map();

        const decodeSoundPlayer = async (url) => {
            const cached = soundPlayerCache.get(url);
            if (cached) {
                if (cached.sound) {
                    return cached.sound;
                }
                throw cached.error;
            }

            try {
                const arrayBuffer = await fetchAsArrayBufferWithTimeout(url);
                const soundPlayer = await audioEngine.decodeSoundPlayer({
                    data: {
                        buffer: arrayBuffer,
                    },
                });
                soundPlayerCache.set(url, {
                    sound: soundPlayer,
                    error: null,
                });
                return soundPlayer;
            } catch (e) {
                soundPlayerCache.set(url, {
                    sound: null,
                    error: e,
                });
                throw e;
            }
        };

        const playWithAudioEngine = async (url, target) => {
            const soundBank = target.sprite.soundBank;

            let soundPlayer;
            try {
                const originalSoundPlayer = await decodeSoundPlayer(url);
                soundPlayer = originalSoundPlayer.take();
            } catch (e) {
                console.warn(
                    "Could not fetch audio; falling back to primitive approach",
                    e
                );
                return false;
            }

            soundBank.addSoundPlayer(soundPlayer);
            await soundBank.playSound(target, soundPlayer.id);

            delete soundBank.soundPlayers[soundPlayer.id];
            soundBank.playerTargets.delete(soundPlayer.id);
            soundBank.soundEffects.delete(soundPlayer.id);

            return true;
        };

        const playWithAudioElement = (url, target) =>
            new Promise((resolve, reject) => {
                const mediaElement = new Audio(url);

                mediaElement.volume = target.volume / 100;

                mediaElement.onended = () => {
                    resolve();
                };
                mediaElement
                    .play()
                    .then(() => {
                        // Wait for onended
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });

        const playSound = async (url, target) => {
            try {
                if (!(await Scratch.canFetch(url))) {
                    throw new Error(`Permission to fetch ${url} denied`);
                }

                const success = await playWithAudioEngine(url, target);
                if (!success) {
                    return await playWithAudioElement(url, target);
                }
            } catch (e) {
                console.warn(`All attempts to play ${url} failed`, e);
            }
        };

        playSound(ab, cd)
    }
    class Extension {
        getInfo() {
            return {
                "id": "browser",
                "name": "Browser",
                "color1": "#009b9e",
                "color2": "#006e70",
                "tbShow": true,
                "blocks": blocks,
                "menus": menus
            }
        }
    }
    blocks.push({
        opcode: "confirm",
        blockType: Scratch.BlockType.BOOLEAN,
        text: "confirm [TEXT]",
        arguments: {
            "TEXT": {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Is a green apple green?',
            },
        },
        disableMonitor: true,
        isEdgeActivated: false
    });
    Extension.prototype["confirm"] = async (args, util) => {
        return confirm(args["TEXT"])
    };

    blocks.push({
        opcode: "prompt",
        blockType: Scratch.BlockType.REPORTER,
        text: "prompt [TEXT]",
        arguments: {
            "TEXT": {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'How are you?',
            },
        },
        disableMonitor: true,
        isEdgeActivated: false
    });
    Extension.prototype["prompt"] = async (args, util) => {
        return prompt(args["TEXT"])
    };

    blocks.push({
        opcode: "alert",
        blockType: Scratch.BlockType.COMMAND,
        text: "Alert the [TEXT] text",
        arguments: {
            "TEXT": {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello, world!',
            },
        },
        disableMonitor: true,
        isEdgeActivated: false
    });
    Extension.prototype["alert"] = async (args, util) => {
        alert(args["TEXT"])
    };

    blocks.push({
        opcode: "newtab",
        blockType: Scratch.BlockType.COMMAND,
        text: "Open [URI] in a new tab",
        arguments: {
            "URI": {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'https://example.com',
            },
        },
        disableMonitor: true,
        isEdgeActivated: false
    });
    Extension.prototype["newtab"] = async (args, util) => {
        window.open(args['URI'], '_blank').focus();;
    };

    blocks.push({
        opcode: "redirect",
        blockType: Scratch.BlockType.COMMAND,
        text: "Redirect to [URI]",
        arguments: {
            "URI": {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'https://example.com',
            },
        },
        disableMonitor: true,
        isEdgeActivated: false
    });
    Extension.prototype["redirect"] = async (args, util) => {
        window.location.href = args['URI'];;
    };

    Scratch.extensions.register(new Extension());
})(Scratch);
