import { UsernameOrKaid, Scratchpads, UserProfileData, User } from "./types/data";
import { querySelectorPromise, querySelectorAllPromise } from "./util/promise-util";
import { getJSON } from "./util/api-util";
import { formatDate } from "./util/text-util";
import { DEVELOPERS } from "./types/names";

async function addUserInfo (uok: UsernameOrKaid): Promise<void> {
	const userEndpoint = `${window.location.origin}/api/internal/user`;

	const Scratchpads = await getJSON(`${userEndpoint}/scratchpads?${uok.type}=${uok.id}&limit=1000`, {
		scratchpads: [{
			sumVotesIncremented: 1,
			spinoffCount: 1
		}]
	}) as Scratchpads;

	const table = await querySelectorPromise(".user-statistics-table > tbody") as HTMLElement;

	const totals = Scratchpads.scratchpads.reduce((current, scratch) => {
		current.votes += scratch.sumVotesIncremented - 1;
		current.spinoffs += scratch.spinoffCount;
		current.inspiration += scratch.spinoffCount > 0 ? 1 : 0;
		return current;
	}, { programs: Scratchpads.scratchpads.length, votes: 0, spinoffs: 0, inspiration: 0 });

	const averageSpinoffs = Math.round(totals.spinoffs / totals.programs || 0);
	const averageVotes = Math.round(totals.votes / totals.programs || 0);

	const badges = await querySelectorAllPromise(".badge-category-count", 10, 500);
	const totalBadges = Array.from(badges).reduce((prev, badge): number => {
		return prev + (parseInt(badge.textContent || "") || 0);
	}, 0) || 0;

	const entries = {
		"Programs": totals.programs,
		"Total votes received": totals.votes,
		"Total spinoffs received": totals.spinoffs,
		"Average votes received": averageVotes,
		"Average spinoffs received": averageSpinoffs,
		"Total badges": totalBadges,
		"Inspiration badges": totals.inspiration,
		"More info": `<a href="${userEndpoint}/profile?${uok.type}=${uok.id}&format=pretty" target="_blank">API endpoint</a>`
	} as { [key: string]: string | number; };

	for (const entry in entries) {
		table.innerHTML += `<tr>
				<td class="user-statistics-label">${entry}</td>
				<td>${entries[entry]}</td>
			</tr>`;
	}

	getJSON(`${userEndpoint}/profile?${uok.type}=${uok.id}`, {
		dateJoined: 1,
		kaid: 1
	})
		.then(data => data as UserProfileData)
		.then(User => {
			const dateElement = document.querySelectorAll("td")[1];
			dateElement!.title = formatDate(User.dateJoined);

			if (DEVELOPERS.includes(User.kaid)) {
				table.innerHTML += `<div class="kae-green user-statistics-label">KA Extension Developer</div>`;
			}

			if (User.kaid === window.KA.kaid) {
				getJSON(`${window.location.origin}/api/v1/user`, {"discussion_banned":1}).then((data: User) => {
					//If something messes up I don't want to accedently tell someone they're banned
					if (!data.hasOwnProperty("discussion_banned")) {
						throw new Error("Error loading ban information.");
					}else if (data.discussion_banned === false) {
						table.innerHTML += `<div>You are not banned</div>`;
					}else if (data.discussion_banned === true) {
						table.innerHTML += `<div style="color: red">You are discussion banned</div>`;
					}else {
						throw new Error("Error loading ban information.");
					}
				});
			}
		});

}

function duplicateBadges (): void {
	const usedBadges = document.getElementsByClassName("used");
	if (usedBadges.length > 0) {
		for (let i = 0; i < usedBadges.length; i++) {
			usedBadges[i].classList.remove("used");
		}
	}
}

export { addUserInfo, duplicateBadges };
