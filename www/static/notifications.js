window.MAXIMUM_AGE = 2*24*60*60*1000;

window.rowToggle = false;

function init()
{
	window.originalTitle = document.title;

	// Convert the timestamps to Date objects
	$("#notificationlist li").each(function()
	{
		var li = $(this);
		var timestamp = new Date(li.data('timestamp') * 1000);
		li.data('timestamp', timestamp);
		li.find(".duration").attr('title', timestamp.toLocaleString());
	});

	if (window.EventSource)
		sse_init();
	else
		ajax_init();
}
$(init);

function newMessage(message)
{
	// The layout here should resemble what's generated by the HTML template
	var newRow = $('<li class="new">');
	if (window.rowToggle)
		newRow.addClass('even');
	else
		newRow.addClass('odd');
	window.rowToggle = !window.rowToggle;
	if (message.time)
	{
		var timestamp = new Date(message.time * 1000);
		newRow.data('timestamp', timestamp);
		$('<div class="duration">').attr('title', timestamp.toLocaleString()).appendTo(newRow);
	}
	if (message.channel)
		$('<div class="channel">').text(message.channel).appendTo(newRow);
	if (message.user)
	{
		var userDiv = $('<div class="user">');
		var url = "http://www.twitch.tv/" + message.user;
		if (message.avatar)
			userDiv.append($('<a>').attr('href', url).append($('<img>').attr('src', message.avatar))).append(' ');
		$('<a>').attr('href', url).text(message.user).appendTo(userDiv);
		userDiv.append(" just subscribed!");
		if (message.monthcount)
			userDiv.append(" " + message.monthcount + " month" + (message.monthcount == 1 ? "" : "s") + " in a row!");
		userDiv.appendTo(newRow);
	}
	else
	{
		$('<div class="message">').text(message.message).appendTo(newRow);
	}
	newRow.one("click", function(){$(this).removeClass("new"); updateTitle();});
	newRow.hide();
	$("#notificationlist").prepend(newRow);
	newRow.slideDown();
	updateTitle();
}

function updateDates()
{
	// Includes removing existing rows older than a couple days
	// (don't let old notifications stick around forever so that you can
	// just leave the page open forever without massive memory leaks)
	var now = new Date();
	$("#notificationlist li").each(function(){
		var li = $(this);
		var timestamp = li.data('timestamp');
		if (timestamp)
		{
			var age = now - timestamp;
			if (age <= MAXIMUM_AGE)
				li.find('.duration').text(niceduration(age / 1000));
			else
				li.remove();
		}
	});
}

function updateTitle()
{
	var newcount = $('#notificationlist li.new').length;
	if (newcount)
		document.title = "(" + newcount + ") " + window.originalTitle;
	else
		document.title = window.originalTitle;
}

//--------------
// SSE code

window.UPDATE_DATES_INTERVAL = 10*1000;

function sse_init()
{
	var stream = new EventSource("notifications/events");
	stream.addEventListener("newmessage", sse_message);
	window.setInterval(updateDates, UPDATE_DATES_INTERVAL);
}

function sse_message(event)
{
	var message = $.parseJSON(event.data);
	newMessage(message);
	updateDates();
}

//--------------
// AJAX fallback

window.UPDATE_INTERVAL = 60*1000;
window.HEARTBEAT_INTERVAL = 5*60*1000;

function ajax_init()
{
	window.maxkey = $("#notificationlist").data('maxkey');
	window.timesrun = 1;
	setInterval(ajax_heartbeat, window.HEARTBEAT_INTERVAL);

	setTimeout(ajax_update, 0);
}

function ajax_heartbeat()
{
	// Make sure the update procedure is being run regularly, in case of network and/or browser glitches
	if (window.timesrun == 0)
		setTimeout(ajax_update, 0);

	window.timesrun = 0;
}

function ajax_update()
{
	window.timesrun++;

	$.ajax({
		'type': 'GET',
		'url': "notifications/updates",
		'data': "after=" + encodeURIComponent(window.maxkey),
		'dataType': 'json',
		'async': true,
		'cache': false,
		'success': ajax_updateSuccess,
		'error': ajax_updateError
	})
}

function ajax_updateSuccess(data)
{
	setTimeout(ajax_update, window.UPDATE_INTERVAL);
	// Add any new rows to the table
	$(data.notifications).each(function(){
		newMessage(this);

		if (this.key > window.maxkey)
			window.maxkey = this.key;
	});

	updateDates();
}

function ajax_updateError(xhr, status, err)
{
	setTimeout(ajax_update, window.UPDATE_INTERVAL);
}
