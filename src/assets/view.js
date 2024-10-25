CTFd._internal.challenge.data = undefined

// CTFd._internal.challenge.renderer = CTFd.lib.markdown();

CTFd._internal.challenge.preRender = function () { }

CTFd._internal.challenge.render = function (markdown) {
    return CTFd._internal.challenge.renderer.render(markdown)
}

CTFd._internal.challenge.postRender = function () { }

CTFd._internal.challenge.submit = function (preview) {
    var challenge_id = parseInt(document.querySelector('#challenge-id').value)
    var submission = document.querySelector('#challenge-input').value

    var body = {
        'challenge_id': challenge_id,
        'submission': submission,
    }
    var params = {}
    if (preview) {
        params['preview'] = true
    }

    return CTFd.api.post_challenge_attempt(params, body).then(function (response) {
        if (response.status === 429) {
            // User was ratelimited but process response
            return response
        }
        if (response.status === 403) {
            // User is not logged in or CTF is paused.
            return response
        }
        return response
    })
};

function toggleLoading(btn) {
    var icon = btn.querySelector('i');
    btn.disabled = !btn.disabled;
    icon.classList.toggle('fa-spin');
    icon.classList.toggle('fa-spinner');
}

function resetAlert() {
    let alert = document.querySelector(".deployment-actions > .alert");
    alert.innerHTML = '';
    alert.classList.remove("alert-danger");
    return alert;
}

function handleErrorResponse(response, alert, btn) {
    if (response.status === 429) {
        alert.append("Slow down! You are too fast. Try again in 1 minute.");
        alert.classList.add("alert-danger");
    } else if (response.status >= 400 && response.status != 404) {
        alert.append(response.error || response.message || "An error occurred while processing the challenge.");
        alert.classList.add("alert-danger");
    }

    if (btn) {
        toggleLoading(btn);
    }
}

function toggleChallengeCreate() {
    let btn = document.querySelector(".create-chal");
    btn.classList.toggle('d-none');
}

function toggleChallengeUpdate() {
    let btn = document.querySelector(".extend-chal");
    btn.classList.toggle('d-none');

    btn = document.querySelector(".terminate-chal");
    btn.classList.toggle('d-none');
}

function calculateExpiry(date) {
    // Get the difference in minutes
    let difference = Math.floor((date - Date.now()) / (1000 * 60));
    return difference;
}

function createChallengeLinkElement(data, parent) {
    if (!data.deployment) {
        let alert = resetAlert();
        alert.append("Challenge not started");
        toggleChallengeCreate();
        toggleChallengeUpdate();
        return;
    }

    let expiry = calculateExpiry(new Date(data.deployment.expires));

    if (expiry > 0) {
        var expires = document.createElement('span');
        expires.textContent = "Expires in " + calculateExpiry(new Date(data.deployment.expires)) + " minutes.";

        // TODO: remove this jank and have a proper way to determine how to connect to chals
        parent.append(expires);
        parent.append(document.createElement('br'));
        if (data.deployment.host.includes("pwn")) {
            var conn_string = document.createElement('span');
            conn_string.textContent = `openssl s_client -quiet -connect ${data.deployment.host}:443`
            parent.append(conn_string);

        } else {
            let link = document.createElement('a');
            link.href = 'https://' + data.deployment.host;
            link.textContent = data.deployment.host;
            link.target = '_blank'
            parent.append(link);
        }

        // Add admin bot link if challenge is tagged with bot
        try {
            const chalTag = document.querySelector(".challenge-tag").textContent;
            if (chalTag.startsWith("#")) {
                parent.append(document.createElement("br"))
                let link = document.createElement('a');
                const subdomains = new URL(`https://${data.deployment.host}`).hostname.split('.')
                const unique = `${subdomains.shift(1)}-${chalTag.substring(1)}`;
                const host = `https://${unique}.${subdomains.join('.')}`
                link.href = host;
                link.target = '_blank'
                link.textContent = host;
                parent.append(link);
            }
        } catch (error) {

        }

    }
}

function awaitChallengeReady(data) {

}

function getDeployment(deployment) {
    let alert = resetAlert();

    fetch("api/kube_ctf/" + deployment)
        .then(response => {
            if (response.status >= 400 && response.status != 404) {
                handleErrorResponse(response, alert);
                return;
            }

            return response.json()
        })
        .then(data => {
            if (!data) {
                return;
            }

            createChallengeLinkElement(data, alert);
            toggleChallengeUpdate();
        })
        .catch(error => {
            console.error(error);
            alert.append("Challenge not started")
            toggleChallengeCreate();
        });
}

function createDeployment(btn) {
    let deployment = btn.dataset.deployment;
    toggleLoading(btn);
    let alert = resetAlert();

    fetch("api/kube_ctf/" + deployment, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "create" })
    })
        .then(response => {
            if (response.status >= 400 && response.status != 404) {
                handleErrorResponse(response, alert, btn);
                return
            }

            return response.json()
        })
        .then(data => {
            if (!data) {
                return;
            }

            createChallengeLinkElement(data, alert);
            toggleChallengeUpdate();
            toggleChallengeCreate();
            toggleLoading(btn);
        })
        .catch(error => {
            alert.append(error.responseJSON?.error || error.responseJSON?.message || error.message);
            alert.classList.add("alert-danger");
            toggleLoading(btn);
        });
}

function extendDeployment(btn) {
    let deployment = btn.dataset.deployment;
    toggleLoading(btn);
    let alert = resetAlert();

    fetch("api/kube_ctf/" + deployment, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "extend" })
    })
        .then(response => {
            if (response.status >= 400 && response.status != 404) {
                handleErrorResponse(response, alert, btn);
                return;
            }

            return response.json()
        })
        .then(data => {
            if (!data) {
                return;
            }

            createChallengeLinkElement(data, alert)
            toggleLoading(btn);
        })
        .catch(error => {
            alert.append(error.responseJSON?.error || error.responseJSON?.message || error.message);
            alert.classList.add("alert-danger");
            toggleLoading(btn);
        });
}

function terminateDeployment(btn) {
    let deployment = btn.dataset.deployment;
    toggleLoading(btn);
    let alert = resetAlert();

    fetch("api/kube_ctf/" + deployment, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "terminate" })
    })
        .then(response => {
            if (response.status === 200 || response.status === 204) {
                alert.append("Challenge Terminated.")
                toggleChallengeCreate();
                toggleChallengeUpdate();
                toggleLoading(btn);
                return;
            }

            handleErrorResponse(response, alert, btn);
        })
        .catch(error => {
            alert.append(error.responseJSON?.error || error.responseJSON?.message || error.message || "An error occurred while terminating the challenge.");
            alert.classList.add("alert-danger");
            toggleLoading(btn);
        });
}

// Start app, by first getting the deployment name
setTimeout(() => {
    let deployment = document.getElementById("deployment-name").value;
    getDeployment(deployment);
}, 200);
