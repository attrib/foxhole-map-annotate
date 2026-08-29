import config from "./config.js";
import type {UserMapFeature} from "./featureLoader.js"

type WeatherInitOpts = {
    url?: string
    bearer?: string
}

type Storm = {
    id: number
    thread_id?: number
    designation: string

    status_id: number
    status_code: string
    status_name: string

    type_id?: number
    type_code?: string
    type_name?: string

    size_id?: number
    size_code?: string
    size_name?: string

    origin_id?: string
    origin_name?: string

    intensity_id?: number
    intensity_code?: string
    intensity_name?: string

    fhs_x?: number
    fhs_y?: number
    radius?: number

    named_by?: number

    ws_prediction?: string
    ws_ongoing?: string
}

type StormFeature = {
    id: string,

}

class WeatherApi {

    enabled: boolean
    url: string
    bearer: string

    constructor(opts: WeatherInitOpts) {
        if (opts && opts.url && opts.bearer) {
            this.url = opts.url
            this.bearer = opts.bearer
            this.enabled = true
        } else {
            this.enabled = false
            this.url = ''
            this.bearer = ''
        }
    }

    async fetchStorms(): Promise<Storm[]> {
        if (!this.enabled) {
            return [];
        }
        return await fetch(`https://${this.url}/api/storms`, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "warden.express",
                "Authorization": `Bearer ${this.bearer}`
            },
        }).then(async (response) => {
            if (response.ok) {
                return await response.json() as Storm[];
            }
            throw new Error(`Error fetching weather data: ${response.status} ${response.body}`)
        });
    }

    async getStormFeatures(): Promise<UserMapFeature[]> {
        return this.fetchStorms()
            .then((storms: Storm[]) => {
                const features: UserMapFeature[] = []
                for (const storm of storms) {
                    let notes = `Warden Weather Channel\n${storm.status_name} ${storm.size_name} ${storm.type_name}`
                    if (storm.designation) {
                        notes += `\nDesignation: ${storm.designation}`
                    }
                    features.push({
                        type: "Feature",
                        properties: {
                            user: "Warden Weather Channel",
                            userId: storm.named_by || '',
                            notes: notes,
                            id: `weather-${storm.id}`,
                            muser: "Warden Weather Channel",
                            muserId: storm.named_by || '',
                            type: 'storm',
                            flags: [],
                            type_code: storm.type_code,
                            radius: storm.radius,
                            // ...storm
                        },
                        geometry: {
                            type: "Point",
                            coordinates: this.fhsToWeCoords(storm.fhs_x, storm.fhs_y)
                        },
                        id: `weather-${storm.id}`
                    })
                }
                return features
            })
    }

    fhsToWeCoords(x: number, y: number): number[] {
        return [
            x * 80,
            y * 80 + 4000
        ];
    }
}

export default new WeatherApi(config.config.weather);
export type { UserMapFeature }