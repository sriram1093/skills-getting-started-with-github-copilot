document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to escape HTML when inserting user-provided text
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select options (avoid duplicates on refresh)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        // mark card with activity name for easy lookup
        activityCard.setAttribute("data-activity", name);

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants HTML with remove button
        const participants = details.participants || [];
        const participantsHtml = participants.length
          ? `<ul class="participants-list">${participants
              .map(
                (p) =>
                  `<li><span class="participant-email">${escapeHtml(p)}</span> <button class="remove-participant" data-activity="${escapeHtml(
                    name
                  )}" data-email="${escapeHtml(p)}" title="Remove participant">✖</button></li>`
              )
              .join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participants</strong>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Handle remove-participant clicks using event delegation
        activityCard.addEventListener("click", async (ev) => {
          const btn = ev.target.closest(".remove-participant");
          if (!btn) return;

          const email = btn.getAttribute("data-email");
          const activityName = btn.getAttribute("data-activity");

          if (!email || !activityName) return;

          if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

          try {
            const res = await fetch(
              `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(
                email
              )}`,
              { method: "DELETE" }
            );

            if (res.ok) {
              await fetchActivities();
            } else {
              const body = await res.json().catch(() => ({}));
              alert(body.detail || "Failed to remove participant");
            }
          } catch (err) {
            console.error(err);
            alert("Error removing participant");
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        // update the UI immediately so the new participant appears
        const card = document.querySelector(`.activity-card[data-activity="${CSS.escape(activity)}"]`);
        if (card) {
          const list = card.querySelector(".participants-list");
          const noPart = card.querySelector(".no-participants");
          const liHtml = `<li><span class=\"participant-email\">${escapeHtml(email)}</span> <button class=\"remove-participant\" data-activity=\"${escapeHtml(activity)}\" data-email=\"${escapeHtml(email)}\" title=\"Remove participant\">✖</button></li>`;
          if (list) {
            list.insertAdjacentHTML("beforeend", liHtml);
          } else if (noPart) {
            noPart.insertAdjacentHTML("afterend", `<ul class=\"participants-list\"></ul>`);
            const newList = card.querySelector(".participants-list");
            newList.innerHTML = liHtml;
          }
        } else {
          // fallback: refresh activities from server
          await fetchActivities();
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
