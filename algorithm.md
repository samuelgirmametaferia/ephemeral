

## 1. User Algorithm (personalization)

Purpose: Decide what a *specific* user sees, based on their activity.

### **Interest Weighting**

For each tag/topic:

```
interest_weight(tag) =
    (likes_given_on_tag * 1) +
    (comments_given_on_tag * 2) +
    (perpetuates_given_on_tag * 3)
```

* This is stored per-user, per-tag.
* Fresh accounts have **full perpetuate value** here (no scaling), because we want to quickly learn preferences.

### **User Feed Post Score**

For a given post shown to a given user:

```
user_feed_score =
    base_post_score +
    (interest_weight_sum_for_post_tags * interest_factor) +
    (similar_creator_bonus) -
    decay(age_in_hours)
```

Where:

* `interest_factor` = 0.2 → adjusts influence of tag matching.
* `similar_creator_bonus` = +1 if the user interacted with this creator before.
* `decay(t)` = `pow(t, decay_factor)` with `decay_factor` ≈ 1.2.

---

## 2. Creator Algorithm (boost ranking)

Purpose: Decide how a perpetuate affects site-wide visibility.

### **Trust Score**

For each perpetuator:

```
trust_score =
    min(1, account_age_days / 14) * engagement_factor
```

Where:

* `account_age_days` = days since account creation.
* `engagement_factor` = min(1, engagement\_points / 10)
* `engagement_points` = (likes\_received\_on\_comments \* 2) + (unique\_commenters\_on\_posts \* 1)

This ensures:

* A 1-day-old account has only \~7% of full perpetuate power.
* Perpetuate power grows with real engagement from others.

---

### **Perpetuate Boost Value**

When a perpetuate is made:

```
boost_value =
    perpetuate_value * trust_score
```

This is stored in the perpetuates table as `trust_value`.

---

### **Creator Ranking Score (post level)**

For site-wide trending:

```
creator_score =
    (likes_count * 1.5) +
    (comments_count * 2.0) +
    (SUM(trust_value) * perpetuate_weight) -
    decay(age_in_hours)
```

Where:

* `perpetuate_weight` ≈ 3.0.
* Decay same as user feed.

---

## 3. Decay Function (both algorithms)

Purpose: Reduce score as posts age, unless boosted.

```
decay(age_in_hours) = pow(age_in_hours, 1.2)
```

* Slows down viral decay so good posts live a bit longer.
* Age is in hours since post creation.

---

## 4. Boost Phase (both algorithms)

If a post’s engagement rate passes the testing threshold:

```
final_score = score * 1.5
```

* Multiplier lasts for X hours, then decays normally.
* Perpetuates can retrigger boost.

---

If you want, I can now **turn these formulas into actual PostgreSQL queries** so that:

* One query generates a *user’s personalized feed*
* Another query generates the *site-wide trending feed*

