import icalendar
import utils
import time
import datetime
import dateutil.rrule
import operator

CACHE_EXPIRY = 15*60
URL = "http://www.google.com/calendar/ical/loadingreadyrun.com_72jmf1fn564cbbr84l048pv1go%40group.calendar.google.com/public/basic.ics"

class CalData(object):
	def __init__(self):
		self.cache_data = None
		self.last_check = None
	def get(self):
		if self.cache_data is not None and time.time() - self.last_check < CACHE_EXPIRY:
			return self.cache_data
		ical = utils.http_request(URL)
		self.cache_data = icalendar.Calendar.from_ical(ical)
		self.last_check = time.time()
		return self.cache_data
get_calendar_data = CalData().get

def get_next_event():
	cal_data = get_calendar_data()
	events = []
	now = datetime.datetime.now(datetime.timezone.utc)
	for ev in cal_data.subcomponents:
		if isinstance(ev, icalendar.Event):
			event_name = str(ev['summary'])
			event_time = ev['dtstart'].dt
			if not isinstance(event_time, datetime.datetime):
				# ignore full-day events
				continue
			if 'rrule' in ev:
				rrule = dateutil.rrule.rrulestr(ev['rrule'].to_ical().decode('utf-8'), dtstart=event_time)
				event_time = rrule.after(now)
			if event_time is not None and event_time > now:
				events.append((event_name, event_time))
	if events:
		event_name, event_time = min(events, key=operator.itemgetter(1))
		event_wait = (event_time - now).total_seconds()
		return event_name, event_time, event_wait
	else:
		return None, None, None
