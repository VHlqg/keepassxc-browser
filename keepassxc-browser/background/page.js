const defaultSettings = {
	checkUpdateKeePassXC: 3,
	autoCompleteUsernames: true,
	autoFillAndSend: true,
	usePasswordGenerator: true,
	autoFillSingleEntry: false,
	autoRetrieveCredentials: true,
	proxyPort: '19700'
}

var page = {};
page.tabs = {};

page.currentTabId = -1;
page.settings = (typeof(localStorage.settings) === 'undefined') ? {} : JSON.parse(localStorage.settings);
page.blockedTabs = {};

page.migrateSettings = () => {
	return new Promise((resolve, reject) => {
		const old = localStorage.getItem('settings');
		if (old) {
			const settings = JSON.parse(old);
			browser.storage.local.set({'settings': settings}).then(() => {
				localStorage.removeItem('settings');
				resolve(obj);
			});
		} else {
			event.onLoadSettings((settings) => {
				resolve(settings);
			});
		}
	});
};

page.initSettings = function() {
	return new Promise((resolve, reject) => {
		page.migrateSettings().then((settings) => {
			page.settings = settings;
			if (!('checkUpdateKeePassXC' in page.settings)) {
				page.settings.checkUpdateKeePassXC = defaultSettings.checkUpdateKeePassXC;
			}
			if (!('autoCompleteUsernames' in page.settings)) {
				page.settings.autoCompleteUsernames = defaultSettings.autoCompleteUsernames;
			}
			if (!('autoFillAndSend' in page.settings)) {
				page.settings.autoFillAndSend = defaultSettings.autoFillAndSend;
			}
			if (!('usePasswordGenerator' in page.settings)) {
				page.settings.usePasswordGenerator = defaultSettings.usePasswordGenerator;
			}
			if (!('autoFillSingleEntry' in page.settings)) {
				page.settings.autoFillSingleEntry = defaultSettings.autoFillSingleEntry;
			}
			if (!('autoRetrieveCredentials' in page.settings)) {
				page.settings.autoRetrieveCredentials = defaultSettings.autoRetrieveCredentials;
			}
			if (!('port' in page.settings)) {
				page.settings.port = defaultSettings.proxyPort;
			}
			browser.storage.local.set({'settings': page.settings});
			resolve();
		});
	});
}

page.initOpenedTabs = function() {
	browser.tabs.query({}).then((tabs) => {
		for (const i of tabs) {
			page.createTabEntry(i.id);
		}
	});
}

page.isValidProtocol = function(url) {
	let protocol = url.substring(0, url.indexOf(':'));
	protocol = protocol.toLowerCase();
	return !(url.indexOf('.') === -1 || (protocol !== 'http' && protocol !== 'https' && protocol !== 'ftp' && protocol !== 'sftp'));
}

page.switchTab = function(callback, tab) {
	browserAction.showDefault(null, tab);
	browser.tabs.sendMessage(tab.id, {action: 'activated_tab'}).catch((e) => {console.log(e);});
}

page.clearCredentials = function(tabId, complete) {
	if (!page.tabs[tabId]) {
		return;
	}

	page.tabs[tabId].credentials = {};
	delete page.tabs[tabId].credentials;

    if (complete) {
        page.clearLogins(tabId);

        browser.tabs.sendMessage(tabId, {
            action: 'clear_credentials'
        }).catch((e) => {console.log(e);});
    }
}

page.clearLogins = function(tabId) {
	page.tabs[tabId].loginList = [];
}

page.createTabEntry = function(tabId) {
	//console.log('page.createTabEntry('+tabId+')');
	page.tabs[tabId] = {
		'stack': [],
		'errorMessage': null,
		'loginList': {}
	};
}

page.removePageInformationFromNotExistingTabs = function() {
	let rand = Math.floor(Math.random()*1001);
	if (rand === 28) {
		browser.tabs.query({}, (tabs) => {
			let $tabIds = {};
			const $infoIds = Object.keys(page.tabs);

			for (const t of tabs) {
				$tabIds[t.id] = true;
			}

			for (const i of $infoIds) {
				if (!(i in $tabIds)) {
					delete page.tabs[i];
				}
			}
		});
	}
};

page.debugConsole = function() {
	if (arguments.length > 1) {
		console.log(page.sprintf(arguments[0], arguments));
	}
	else {
		console.log(arguments[0]);
	}
};

page.sprintf = function(input, args) {
	return input.replace(/{(\d+)}/g, (match, number) => {
      return typeof args[number] !== 'undefined'
        ? (typeof args[number] === 'object' ? JSON.stringify(args[number]) : args[number])
        : match
      ;
    });
}

page.debugDummy = function() {};

page.debug = page.debugDummy;

page.setDebug = function(bool) {
	if (bool) {
		page.debug = page.debugConsole;
		return 'Debug mode enabled';
	}
	else {
		page.debug = page.debugDummy;
		return 'Debug mode disabled';
	}
};
