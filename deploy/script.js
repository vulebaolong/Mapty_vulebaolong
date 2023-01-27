"use strict";

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");

const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputPower = document.querySelector(".form__input--power");
const labelPower = document.querySelector(".form__label--power");
const deleteAll = document.querySelector(".delete_all");

class Workout {
    id = +Date.now();
    constructor(coord, distance, duration) {
        this.coord = coord;
        this.distance = distance; //km
        this.duration = duration; //min
    }

    _content() {
        function capitalise(input, separator) {
            const wordArray = input.split(separator);
            const output = wordArray.map(
                (word) =>
                    `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`
            );
            return output.join(separator);
        }

        this.content = `${
            // type[0].toUpperCase() + type.slice(1)
            capitalise(this.type)
        } on ${new Intl.DateTimeFormat(navigator.language, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            day: "2-digit", //numeric, 2-digit
            month: "2-digit",
        }).format(new Date())}`;
    }
}

class Running extends Workout {
    type = "running";
    constructor(coord, distance, duration, cadence) {
        super(coord, distance, duration);
        this.cadence = cadence;
        this._calcPace();
        this._content();
    }

    _calcPace() {
        // min/km
        return (this.pace = this.duration / this.distance);
    }
}

class Cycling extends Workout {
    type = "cycling";
    constructor(coord, distance, duration, elevationGain) {
        super(coord, distance, duration);
        this.elevationGain = elevationGain;
        this._calcSpeed();
        this._content();
    }

    _calcSpeed() {
        // km/h
        return (this.speed = this.distance / (this.duration / 60));
    }
}

class App {
    #map;
    #mapEvent;
    #workOuts = [];
    #Layer = [];
    #coords;

    constructor() {
        this._getPosition();
        this._eventListener();
    }

    _getPosition() {
        function returnPosition(position) {
            const { latitude, longitude } = position.coords;
            this._loadMap([latitude, longitude]);
            this.#coords = [latitude, longitude];
        }
        function getLocation() {
            const text =
                "cần quyền vị trí để sử dụng\nVui lòng truy cập đường dẫn sau\nchrome://settings/content/location\nnhấn OK để coppy đường dẫn";
            if (confirm(text) == true) {
                console.log("You pressed OK!");
                navigator.clipboard.writeText(
                    "chrome://settings/content/location"
                );
            } else {
                this._getPosition();
            }
        }
        navigator.geolocation.getCurrentPosition(
            returnPosition.bind(this),
            getLocation.bind(this),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            }
        );
    }

    _loadMap(coords) {
        this.#map = L.map("map").setView(coords, 13);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);

        this.#map.on("click", this._showForm.bind(this));

        this._getLocalStorage();
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;

        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputPower.value = "";
        form.classList.add("hidden");
    }

    _hideFormKey(e) {
        if (e.key === "Escape") this._hideForm();
    }

    _eventListener() {
        inputType.addEventListener("change", this._togglElevField.bind(this));
        form.addEventListener("submit", this._newWorkOut.bind(this));
        containerWorkouts.addEventListener("click", this._click.bind(this));
        document.addEventListener("keyup", this._hideFormKey.bind(this));
        deleteAll.addEventListener("click", this._deleteAll.bind(this));
    }

    _click(e) {
        function clickView(e, _this) {
            const item = e.target.closest(".workout");
            if (!item) return;
            const idItem = +item.dataset.id;
            const workOut = _this.#workOuts.find((e) => e.id === idItem);
            _this.#map.setView(workOut.coord, 13, {
                animate: true,
                duration: 1,
            });
        }
        function deleteItem(e, _this) {
            const item = e.target.closest(".workout");
            const idItem = +item.dataset.id;

            _this._deleteWorkout(item);
            _this._deleteMarker(idItem);
        }

        if (e.target.classList.contains("delete_item")) {
            deleteItem(e, this);
        } else {
            clickView(e, this);
        }
    }

    _togglElevField() {
        // // prettier-ignore
        // inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
        // // prettier-ignore
        // inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        labelPower.textContent = "Elev Gain";
        inputPower.attributes.placeholder.value = "meters";
    }

    _newWorkOut(e) {
        e.preventDefault();
        let work;

        const type = inputType.value;
        const { lat, lng } = this.#mapEvent.latlng;
        const inputArr = [
            +inputDistance.value,
            +inputDuration.value,
            +inputPower.value,
        ];

        // If workout running, create running object
        if (type === "running") {
            work = new Running([lat, lng], ...inputArr);
        }
        if (type === "cycling") {
            work = new Cycling([lat, lng], ...inputArr);
        }

        // Render workout on map as marker
        this._renderWorkoutMarker(work);

        // Render workout on list
        this._renderWorkout(work);

        // Hide form + clear input fields
        this._hideForm();

        // this._addArrworkout(work);
        this.#workOuts.push(work);

        // sace data to localStorage
        this._setLocalStorage();
    }

    _renderWorkoutMarker(work) {
        const { coord, type } = work;
        const layer = L.marker(coord, { riseOnHover: true, opacity: 1 })
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${type}-popup`,
                    riseOnHover: true,
                })
            )
            .setPopupContent(
                `${type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${work.content}`
            )
            .openPopup();
        this.#Layer.push({
            layer,
            id: work.id,
        });
        //add key layer to remove
        // work.layer = layer;
    }

    _renderWorkout(work) {
        const type = work.type;
        const content = work.content;
        const id = work.id;
        const icon1 = type === "running" ? "🏃‍♂️" : "🚴‍♀️";
        const icon2 = type === "running" ? "🦶🏼" : "⛰";
        const unit1 = type === "running" ? "min/km" : "km/h";
        const unit2 = type === "running" ? "spm" : "m";
        const duration = +work.duration.toFixed(2);
        const distance = +work.distance.toFixed(2);
        const power = +(work.cadence || work.elevationGain || "0").toFixed(2);
        const calcpower = +(work.pace || work.speed || "0").toFixed(2);
        const str = `<li class="workout workout--${type}" data-id="${id}">
        <h2 class="workout__title">${content}</h2>
        <div class="workout__details">
          <span class="workout__icon">${icon1}</span>
          <span class="workout__value">${distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${calcpower}</span>
          <span class="workout__unit">${unit1}</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${icon2}</span>
          <span class="workout__value">${power}</span>
          <span class="workout__unit">${unit2}</span>
        </div>
        <button class="delete_item">x</button>
      </li>`;
        const html = new DOMParser().parseFromString(str, "text/html").body
            .firstChild;
        containerWorkouts.prepend(html);
    }

    _deleteMarker(idItem) {
        console.log(idItem);
        console.log(this.#Layer);

        let indexLayer;
        let indexworkOuts;
        this.#Layer.forEach((e, i) => {
            if (e.id === idItem) {
                indexLayer = i;
                e.layer.remove();
            }
        });

        this.#workOuts.forEach((e, i) => {
            if (e.id === idItem) {
                indexworkOuts = i;
            }
        });

        this.#Layer.splice(indexLayer, 1);
        this.#workOuts.splice(indexworkOuts, 1);
        this._setLocalStorage();
    }

    _deleteWorkout(item) {
        item.remove();
    }

    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workOuts));
    }

    _getLocalStorage() {
        // if (this.#workOuts) return;
        this.#workOuts = JSON.parse(localStorage.getItem("workouts")) || [];
        this.#workOuts.forEach((work) => {
            this._renderWorkout(work);
            this._renderWorkoutMarker(work);
        });
    }

    _deleteAll() {
        this.#Layer.forEach((e) => {
            e.layer.remove();
        });
        this.#Layer = [];
        this.#workOuts = [];
        this._setLocalStorage();
        containerWorkouts.innerHTML = "";
    }

    reset() {
        location.reload();
    }
}
const app = new App();
